import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@lib': path.resolve(__dirname, './src/lib'),
            '@types': path.resolve(__dirname, './src/types'),
        },
    },
    build: {
        outDir: '../build',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'dashboard.js',
                assetFileNames: 'dashboard.[ext]',
            },
        },
    },
    server: {
        port: 5173,
    },
});
