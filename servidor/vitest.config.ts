import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.prueba.ts'],
    environment: 'node',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      URL_PUBLICA: 'http://localhost:5180',
      DATABASE_URL: 'postgres://arrancar_app:arrancar_app@localhost:5433/arrancar_pruebas',
      DATABASE_URL_PROPIETARIO: 'postgres://arrancar:arrancar@localhost:5433/arrancar_pruebas',
      RUTA_ALMACENAMIENTO: './almacenamiento-pruebas',
    },
  },
});
