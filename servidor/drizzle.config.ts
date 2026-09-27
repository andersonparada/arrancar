import { defineConfig } from 'drizzle-kit';

/**
 * Cada módulo tiene sus propias migraciones. `generar-migracion.ts` fija MODULO
 * y drizzle-kit solo compara las tablas de ese módulo: las de la arquitectura por
 * capas (`infraestructura/persistencia/*.tablas.ts`) y las del código aún no
 * migrado (`esquemas/*.esquema.ts`).
 */
const modulo = process.env.MODULO;
if (!modulo) throw new Error('Indique el módulo: npm run bd:generar -- <modulo> <nombre>');

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    `./src/modulos/${modulo}/infraestructura/persistencia/*.tablas.ts`,
    `./src/modulos/${modulo}/esquemas/*.esquema.ts`,
  ],
  out: `./src/modulos/${modulo}/migraciones`,
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL_PROPIETARIO ?? '',
  },
});
