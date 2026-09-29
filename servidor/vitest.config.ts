import { defineConfig } from 'vitest/config';

const basePruebas = process.env.BD_PRUEBAS ?? 'arrancar_pruebas';

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
    },
  },
});
