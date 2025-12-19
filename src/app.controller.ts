import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHome(@Res() res: FastifyReply) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stream Cancellation Demo</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          #logs { background: #f0f0f0; padding: 10px; height: 300px; overflow-y: scroll; border: 1px solid #ccc; margin-top: 10px; }
          button { padding: 10px 20px; font-size: 16px; margin-right: 10px; cursor: pointer; }
          .error { color: red; }
          .success { color: green; }
        </style>
      </head>
      <body>
        <h1>NestJS Fastify Stream Cancellation</h1>
        <p>Click "Start Stream" to initiate a request. Click "Cancel Stream" to abort it.</p>
        
        <button id="startBtn">Start Stream</button>
        <button id="cancelBtn" disabled>Cancel Stream</button>
        
        <div id="logs"></div>

        <script>
          let controller = null;
          const startBtn = document.getElementById('startBtn');
          const cancelBtn = document.getElementById('cancelBtn');
          const logsDiv = document.getElementById('logs');

          function log(message, type = '') {
            const div = document.createElement('div');
            div.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            if (type) div.className = type;
            logsDiv.appendChild(div);
            logsDiv.scrollTop = logsDiv.scrollHeight;
          }

          startBtn.addEventListener('click', async () => {
            logsDiv.innerHTML = ''; // Clear logs
            startBtn.disabled = true;
            cancelBtn.disabled = false;
            
            controller = new AbortController();
            const signal = controller.signal;
            
            log('Starting stream request...');
            
            try {
              const response = await fetch('/stream-http', { signal });
              log('Response headers received');
              
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  log('Stream complete', 'success');
                  break;
                }
                const text = decoder.decode(value, { stream: true });
                log('Received: ' + text.trim());
              }
            } catch (err) {
              if (err.name === 'AbortError') {
                log('Fetch aborted by user', 'error');
              } else {
                log('Error: ' + err.message, 'error');
              }
            } finally {
              startBtn.disabled = false;
              cancelBtn.disabled = true;
              controller = null;
              log('Request finished/terminated');
            }
          });

          cancelBtn.addEventListener('click', () => {
             if (controller) {
               log('Aborting request...');
               controller.abort();
             }
          });
        </script>
      </body>
      </html>
    `);
  }

  @Get('client-rxjs')
  getClientRxjs(@Res() res: FastifyReply) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RxJS Stream Cancellation</title>
        <script src="https://unpkg.com/rxjs@^7/dist/bundles/rxjs.umd.min.js"></script>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          #logs { background: #f0f0f0; padding: 10px; height: 300px; overflow-y: scroll; border: 1px solid #ccc; margin-top: 10px; }
          button { padding: 10px 20px; font-size: 16px; margin-right: 10px; cursor: pointer; }
          .error { color: red; }
          .success { color: green; }
        </style>
      </head>
      <body>
        <h1>RxJS fromFetch Stream Cancellation</h1>
        <p>Using <code>fromFetch</code>. Clicking "Cancel" calls <code>subscription.unsubscribe()</code>, which aborts the request automatically.</p>
        
        <button id="startBtn">Start Stream (RxJS)</button>
        <button id="cancelBtn" disabled>Cancel Stream (Unsubscribe)</button>
        
        <div id="logs"></div>

        <script>
          const { fromFetch } = rxjs.fetch;
          const { tap, switchMap } = rxjs.operators;
          
          let subscription = null;
          const startBtn = document.getElementById('startBtn');
          const cancelBtn = document.getElementById('cancelBtn');
          const logsDiv = document.getElementById('logs');

          function log(message, type = '') {
            const div = document.createElement('div');
            div.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            if (type) div.className = type;
            logsDiv.appendChild(div);
            logsDiv.scrollTop = logsDiv.scrollHeight;
          }

          startBtn.addEventListener('click', () => {
            logsDiv.innerHTML = '';
            startBtn.disabled = true;
            cancelBtn.disabled = false;
            
            log('Subscribing to fromFetch...');
            
            subscription = fromFetch('/stream-http').pipe(
               switchMap(response => {
                   if (response.ok) {
                       log('Response started');
                       // response.body is a ReadableStream
                       const reader = response.body.getReader();
                       const decoder = new TextDecoder();
                       
                       return new rxjs.Observable(observer => {
                           function read() {
                               reader.read().then(({ done, value }) => {
                                   if (done) {
                                       observer.complete();
                                       return;
                                   }
                                   const text = decoder.decode(value, { stream: true });
                                   observer.next(text);
                                   read();
                               }).catch(err => observer.error(err));
                           }
                           read();
                           
                           // Teardown logic when unsubscribed
                           return () => {
                               log('Observable teardown: canceling reader');
                               reader.cancel(); 
                           };
                       });
                   } else {
                       return rxjs.throwError('Error ' + response.status);
                   }
               })
            ).subscribe({
               next: (value) => log('Received: ' + value.trim()),
               error: (err) => {
                   log('Error: ' + err, 'error');
                   resetButtons();
               },
               complete: () => {
                   log('Stream complete', 'success');
                   resetButtons();
               }
            });
          });

          cancelBtn.addEventListener('click', () => {
             if (subscription) {
               log('Calling subscription.unsubscribe()...');
               subscription.unsubscribe();
               subscription = null;
               log('Unsubscribed (Request aborted)', 'error');
               resetButtons();
             }
          });
          
          function resetButtons() {
              startBtn.disabled = false;
              cancelBtn.disabled = true;
          }
        </script>
      </body>
      </html>
     `);
  }

  @Get('stream-http')
  streamHttp(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    console.log('New stream connection initiated');
    res.raw.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.raw.setHeader('Transfer-Encoding', 'chunked');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.setHeader('Access-Control-Allow-Origin', '*');

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const chunk = `Chunk ${counter}: ${new Date().toISOString()}\n`;
      // Check if writable before writing to avoid errors if already closed but event not fired yet (rare)
      if (!res.raw.writableEnded) {
        res.raw.write(chunk);
        console.log(`Server sent: ${chunk.trim()}`);
      }
    }, 1000);

    const safetyTimeout = setTimeout(() => {
      if (!res.raw.writableEnded) {
        console.log('Finished stream normally');
        clearInterval(interval);
        res.raw.end();
      }
    }, 60000);

    res.raw.on('close', () => {
      console.log(`Client connection closed. Stopping stream after ${counter} chunks.`);
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    });
  }
}
