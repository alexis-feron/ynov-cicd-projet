import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.module.ts',
        '**/main.ts',
        'src/prisma/**',
        'src/**/*.dto.ts',
        'src/**/*.entity.ts', // entités testées indirectement
        'src/**/*.interface.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, 'src/common'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
});
