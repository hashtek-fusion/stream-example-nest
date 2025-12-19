# Stream Implementation Clarifications

## 1. Fetch vs. RxJS `fromFetch`
*   **Standard `fetch`**: You must manually create an `AbortController`, pass its `signal` to the fetch options, and call `controller.abort()` to cancel.
*   **RxJS `fromFetch`**: Handles the `AbortController` internally. Subscribing initiates the request; **Unsubscribing** automatically triggers the abort signal.

## 2. RxJS Observable Teardown
When creating a custom Observable to consume a stream reader (like `response.body.getReader()`):
*   **Why Add Teardown?** `unsubscribe()` only stops the Observable from emitting. It does not automatically close the underlying browser resource.
*   **Implementation**: You must return a teardown function that calls `reader.cancel()`. This explicitly signals the browser to close the network connection.

## 3. HTTP Status 200 & "Completed"
*   **Status 200 OK**: Appears in the Network tab as soon as the **Headers** are received (First Byte). It does NOT mean the body is fully downloaded.
*   **Pending/Loading**: The request remains active (spinner/waterfall) until the stream is closed by the server (`res.end()`) or aborted by the client.
*   **Delay**: If you don't write data immediately using `res.write()`, the client (and Network tab) will wait (pending status) until the first chunk arrives.

## 4. Server Event `req.raw.on('close')` vs `res.raw.on('close')`
*   **Shared Socket**: In Node.js, the request (`IncomingMessage`) and response (`ServerResponse`) share the same underlying TCP socket.
*   **Behavior**: When the client aborts, the socket closes, causing **both** `req.raw` and `res.raw` to emit the `close` event.
*   **Convention**:
    *   `req.raw.on('close')`: historically common to detect "client disconnected".
    *   `res.raw.on('close')`: perfectly valid (and often more logical) when your focus is on the *outgoing* stream lifecycle.
*   **Recommendation**: You can use either. Using `res.raw.on('close')` is arguably more semantically correct for monitoring the *response* stream status.

## 5. False "Finished" Logs (Bug Fix)
*   **Issue**: A safety `setTimeout` was triggering "Finished normally" even after an abort because it wasn't cleared.
*   **Fix**: Always `clearTimeout(safetyTimeout)` inside the `close` event handler to ensure logic only runs once.
