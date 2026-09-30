import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

const basePruebas = process.env.BD_PRUEBAS ?? 'arrancar_pruebas';

/** Del `.env` de desarrollo solo se toma dónde está qpdf (cuando no está en `/usr/bin/qpdf`). */
const archivoEnv = new URL('../.env', import.meta.url);
const rutaQpdf = existsSync(archivoEnv) ? parseEnv(readFileSync(archivoEnv, 'utf8')).RUTA_QPDF : undefined;

export default defineConfig({
  test: {
    include: ['src/**/*.prueba.ts'],
    environment: 'node',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      URL_PUBLICA: 'http://localhost:5180',
      DATABASE_URL: `postgres://arrancar_app:arrancar_app@localhost:5433/${basePruebas}`,
      DATABASE_URL_PROPIETARIO: `postgres://arrancar:arrancar@localhost:5433/${basePruebas}`,
      RUTA_ALMACENAMIENTO: './almacenamiento-pruebas',
      ...(rutaQpdf ? { RUTA_QPDF: rutaQpdf } : {}),
    },
  },
});
