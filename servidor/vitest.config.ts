import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';
import { trabajadoresPorOmision, validarCantidadDeWorkers } from './src/pruebas-api/paralelo/nombres-de-bases.js';

const workersDelEntorno = process.env.VITEST_MAX_WORKERS;
if (workersDelEntorno !== undefined) validarCantidadDeWorkers(workersDelEntorno, 'VITEST_MAX_WORKERS');

/** Del `.env` de desarrollo solo se toma dónde está qpdf (cuando no está en `/usr/bin/qpdf`). */
const archivoEnv = new URL('../.env', import.meta.url);
const rutaQpdf = existsSync(archivoEnv) ? parseEnv(readFileSync(archivoEnv, 'utf8')).RUTA_QPDF : undefined;

export default defineConfig({
  test: {
    include: ['src/**/*.prueba.ts'],
    environment: 'node',
    // Un worker por base de datos (`globalSetup` las crea y `setupFiles` apunta cada worker a la suya).
    fileParallelism: true,
    // En paralelo los núcleos se reparten entre workers: las pruebas pesadas necesitan más holgura.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Con `--maxWorkers` o `VITEST_MAX_WORKERS` manda Vitest; `globalSetup` crea tantas bases como workers resueltos.
    ...(workersDelEntorno ? {} : { maxWorkers: trabajadoresPorOmision() }),
    globalSetup: ['./src/pruebas-api/paralelo/preparar-bases-paralelas.ts'],
    setupFiles: ['./src/pruebas-api/paralelo/entorno-por-worker.ts'],
    env: {
      NODE_ENV: 'test',
      URL_PUBLICA: 'http://localhost:5180',
      ...(rutaQpdf ? { RUTA_QPDF: rutaQpdf } : {}),
    },
  },
});
