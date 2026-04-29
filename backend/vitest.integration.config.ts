import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Config pour les tests d'intégration :
 * - timeout long (Testcontainers démarre Docker ~10-20s)
 * - séquentiel (une seule instance DB partagée)
 * - fichiers séparés des tests unitaires
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.integration-spec.ts'],
    hookTimeout: 60_000, // démarrage Docker
    testTimeout: 30_000,
    pool: 'forks',       // isolation processus pour les containers
    poolOptions: {
      forks: { singleFork: true }, // un seul fork = DB partagée entre les suites
    },
    sequence: {
      concurrent: false, // tests d'intégration séquentiels
    },
  },
  resolve: {
    alias: {
      '@common': resolve(__dirname, 'src/common'),
      '@modules': resolve(__dirname, 'src/modules'),
    },
  },
});
