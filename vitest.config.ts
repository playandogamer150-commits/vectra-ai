import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['server/tests/**/*.test.ts', 'client/**/*.test.ts', 'client/**/*.test.tsx'],
        globals: true,
        environmentMatchGlobs: [
            ['client/**', 'jsdom'],
            ['server/**', 'node'],
        ],
        setupFiles: ['./client/test/setup.ts'],
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "client", "src"),
            "@shared": path.resolve(import.meta.dirname, "shared"),
        },
    },
} as any);
