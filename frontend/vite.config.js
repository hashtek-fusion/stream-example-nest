
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/stream-http': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                // secure: false, // not strictly needed for http
            }
        }
    }
});
