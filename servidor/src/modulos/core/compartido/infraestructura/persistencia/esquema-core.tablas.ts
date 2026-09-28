import { pgSchema } from 'drizzle-orm/pg-core';

/** Esquema de PostgreSQL con las tablas del núcleo. Cada módulo tiene el suyo. */
export const esquemaCore = pgSchema('core');
