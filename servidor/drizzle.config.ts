import { defineConfig } from 'drizzle-kit';

/**
 * Cada módulo tiene sus propias migraciones. `generar-migracion.ts` fija MODULO
 * y drizzle-kit solo compara las tablas de ese módulo
 * (`infraestructura/persistencia/*.tablas.ts`, que en el core están dentro de
 * cada contexto).
 */
const modulo = process.env.MODULO;
if (!modulo) throw new Error('Indique el módulo: npm run bd:generar -- <modulo> <nombre>');

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    `./src/modulos/${modulo}/infraestructura/persistencia/*.tablas.ts`,
    `./src/modulos/${modulo}/*/infraestructura/persistencia/*.tablas.ts`,
  ],
  out: `./src/modulos/${modulo}/migraciones`,
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL_PROPIETARIO ?? '',
  },
});
