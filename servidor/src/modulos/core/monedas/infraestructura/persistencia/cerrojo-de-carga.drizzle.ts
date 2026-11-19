import type pg from 'pg';
import type { CerrojoDeCarga } from '../../aplicacion/puertos/cargas-de-tipos.js';

/** Clave fija del cerrojo consultivo de PostgreSQL para la carga de tipos de cambio: no la use otra tarea. */
const CLAVE_DEL_CERROJO = 7_301_913_002;

/**
 * Con varias instancias de la app, solo una carga a la vez: toma `pg_try_advisory_lock` en una conexión propia y lo
 * suelta al terminar (si la conexión muere, PostgreSQL lo suelta solo).
 */
export class CerrojoDeCargaPostgres implements CerrojoDeCarga {
  constructor(private readonly grupo: pg.Pool) {}

  async ejecutarSiLibre<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado | null> {
    const conexion = await this.grupo.connect();
    try {
      const { rows } = await conexion.query<{ tomado: boolean }>('select pg_try_advisory_lock($1) as tomado', [
        CLAVE_DEL_CERROJO,
      ]);
      if (!rows[0]?.tomado) return null;
      try {
        return await trabajo();
      } finally {
        await conexion.query('select pg_advisory_unlock($1)', [CLAVE_DEL_CERROJO]);
      }
    } finally {
      conexion.release();
    }
  }
}
