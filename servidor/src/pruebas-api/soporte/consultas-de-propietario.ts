import pg from 'pg';
import { configuracion } from '../../configuracion.js';

/** Consulta a la base como propietario (sin RLS): para revisar lo que la aplicación no puede ver a su gusto. */
export async function comoPropietario<T extends pg.QueryResultRow>(sql: string, parametros: unknown[]): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql, parametros)).rows;
  } finally {
    await conexion.end();
  }
}
