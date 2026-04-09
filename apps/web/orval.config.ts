import { defineConfig } from 'orval';

export default defineConfig({
    api: {
        input: {
            target: 'http://localhost:3000/api-json',
        },
        output: {
            target: './src/lib/api/client.ts',
            client: 'react-query',
            httpClient: 'fetch',
            mode: 'split',
        },
    },
});