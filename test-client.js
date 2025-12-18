
const controller = new AbortController();
const signal = controller.signal;

async function run() {
    console.log('Client: Starting request...');

    // Abort after 2.5 seconds (should see ~2 chunks)
    setTimeout(() => {
        console.log('Client: Aborting...');
        controller.abort();
    }, 2500);

    try {
        const response = await fetch('http://localhost:3000/stream-http', { signal });
        // In Node fetch, body is a stream.
        // response.body is a ReadableStream (web stream)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            console.log('Client received chunk:', decoder.decode(value).trim());
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Client: Request aborted successfully.');
        } else {
            if (err.cause && err.cause.name === 'AbortError') {
                console.log('Client: Request aborted successfully (nested).');
            } else {
                console.error('Client: Error:', err);
            }
        }
    }
}

run();
