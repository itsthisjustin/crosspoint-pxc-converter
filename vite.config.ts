import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Keep production assets relative so the creator can be mounted below any
  // CrossPoint Reader tools route without rebuilding for a specific pathname.
  base: './',
  test: {
    environment: 'node',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
