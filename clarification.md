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

## 4. Server Event `req.raw.on('close')`
*   **Trigger**: Fires whenever the underlying TCP connection is terminated.
*   **Scenarios**:
    1.  **Client Abort**: User clicks cancel or closes tab (Fires immediately).
    2.  **Network Drop**: Connection lost.
    3.  **Normal End**: After `res.end()`, the socket eventually closes.
*   **Distinction**: To distinguish an abort from a normal finish, check `res.raw.writableEnded`:
    *   `true` = Stream finished normally by server.
    *   `false` = Connection closed prematurely (Abort/Error).
