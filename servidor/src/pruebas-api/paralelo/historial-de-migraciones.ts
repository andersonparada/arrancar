import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import pg from 'pg';
import { nombreEsquemaDe } from '../../modulos/core/base-datos/migrador.js';

/** Una migración tal como la guarda drizzle: su hash y su fecha (`created_at`). */
export interface MigracionConocida {
  hash: string;
  fecha: number;
}

const CARPETA_MODULOS = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'modulos');

/**
 * Dice si el historial aplicado en una base no sirve para migrarla con el código actual. El migrador de
 * drizzle salta lo anterior a la última migración aplicada y no compara hashes, así que hay que
 * descartar la base si tiene alguna migración que ya no existe o si falta una con fecha anterior a la última aplicada.
 */
export function historialIncompatible(
  aplicadas: readonly MigracionConocida[],
  locales: readonly MigracionConocida[],
): boolean {
  if (aplicadas.length === 0) return false;
  const hashesLocales = new Set(locales.map((m) => m.hash));
  if (aplicadas.some((m) => !hashesLocales.has(m.hash))) return true;
  const hashesAplicados = new Set(aplicadas.map((m) => m.hash));
  const ultima = Math.max(...aplicadas.map((m) => m.fecha));
  return locales.some((m) => !hashesAplicados.has(m.hash) && m.fecha <= ultima);
}

/** Migraciones del código actual de un módulo, o ninguna si no tiene journal. */
export function migracionesLocalesDe(clave: string): MigracionConocida[] {
  try {
    const carpeta = join(CARPETA_MODULOS, clave, 'migraciones');
    return readMigrationFiles({ migrationsFolder: carpeta }).map((m) => ({ hash: m.hash, fecha: m.folderMillis }));
  } catch {
    return [];
  }
}

async function migracionesAplicadasDe(conexion: pg.Client, clave: string): Promise<MigracionConocida[]> {
  const tabla = `migraciones_${nombreEsquemaDe(clave)}`;
  const existe = await conexion.query('select 1 from pg_tables where schemaname = $1 and tablename = $2', [
    'drizzle',
    tabla,
  ]);
  if (existe.rowCount === 0) return [];
  const { rows } = await conexion.query<{ hash: string; created_at: string }>(
    `select hash, created_at from drizzle.${pg.escapeIdentifier(tabla)}`,
  );
  return rows.map((fila) => ({ hash: fila.hash, fecha: Number(fila.created_at) }));
}

/** Revisa, módulo por módulo, si el historial de migraciones de la base sirve con el código actual. */
export async function baseConHistorialIncompatible(
  urlPropietario: string,
  claves: readonly string[],
): Promise<boolean> {
  const conexion = new pg.Client({ connectionString: urlPropietario });
  await conexion.connect();
  try {
    for (const clave of claves) {
      if (historialIncompatible(await migracionesAplicadasDe(conexion, clave), migracionesLocalesDe(clave)))
        return true;
    }
    return false;
  } finally {
    await conexion.end();
  }
}
