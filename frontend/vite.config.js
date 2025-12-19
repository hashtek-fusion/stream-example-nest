
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/stream-http': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/stream-upstream': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
    }
});
