import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/economy/**/*.test.ts',
      'tests/investments/**/*.test.ts',
      'tests/world/**/*.test.ts',
    ],
    environment: 'node',
    testTimeout: 120_000,
  },
});
