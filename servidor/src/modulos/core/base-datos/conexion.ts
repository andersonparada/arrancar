import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { configuracion } from '../../../configuracion.js';

export const grupoConexiones = new pg.Pool({
  connectionString: configuracion.DATABASE_URL,
  max: 10,
});

export const bd = drizzle(grupoConexiones, { casing: 'snake_case' });

export type BaseDatos = typeof bd;
export type Transaccion = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
/** Cualquier objeto capaz de ejecutar consultas: la conexión global o una transacción. */
export type Ejecutor = BaseDatos | Transaccion;
