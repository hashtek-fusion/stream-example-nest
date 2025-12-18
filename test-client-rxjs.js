
const { fromFetch } = require('rxjs/fetch');
const { switchMap } = require('rxjs/operators');
const { Observable, throwError } = require('rxjs');

// Polyfill global fetch if needed (Node 18+ has it by default, but safe to check)
if (!global.fetch) {
    console.error('This script requires Node 18+ for global fetch support.');
    process.exit(1);
}

console.log('RxJS Client: Starting request...');

const subscription = fromFetch('http://localhost:3000/stream-http').pipe(
    switchMap(response => {
        if (response.ok) {
            console.log('RxJS Client: Response started');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            return new Observable(observer => {
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

                // Teardown logic
                return () => {
                    console.log('RxJS Client: Teardown logic triggered. Canceling stream reader.');
                    reader.cancel();
                };
            });
        } else {
            return throwError(() => 'Error ' + response.status);
        }
    })
).subscribe({
    next: (value) => console.log('RxJS Client Received:', value.trim()),
    error: (err) => console.error('RxJS Client Error:', err),
    complete: () => console.log('RxJS Client: Complete')
});

// Unsubscribe after 3.5 seconds
setTimeout(() => {
    console.log('RxJS Client: Unsubscribing (this triggers abort)...');
    subscription.unsubscribe();
}, 3500);
