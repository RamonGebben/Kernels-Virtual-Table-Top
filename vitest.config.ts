import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    exclude: [
      'e2e/**/*',
      'playwright.config.ts',
      '**/node_modules/**',
      '**/.next/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        'playwright.config.ts',
        '**/*.config.*',
        'next-env.d.ts',
        '**/next.config.*',
        '**/eslint.config.*',
        '**/vitest.setup.ts',
        '**/e2e/**',
        '**/server/**',
        '**/components/icons/**',
        'src/app/**/page.tsx',
        'src/app/layout.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/': path.resolve(__dirname, './src'),
    },
  },
});
