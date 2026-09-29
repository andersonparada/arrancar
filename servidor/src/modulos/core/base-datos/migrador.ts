import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { DefinicionModulo } from '../modulos-sistema/definicion-modulo.js';

const CARPETA_MODULOS = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROL_APLICACION = 'arrancar_app';

/** Nombre del esquema de PostgreSQL de un módulo (`moneda-extranjera` → `moneda_extranjera`). */
export function nombreEsquemaDe(claveModulo: string): string {
  return claveModulo.replaceAll('-', '_');
}

/**
 * Da al rol de la aplicación acceso de lectura y escritura a las tablas del esquema.
 * Es idempotente, así que se ejecuta después de cada migración.
 */
async function otorgarPermisosAplicacion(conexion: pg.Client, esquema: string): Promise<void> {
  const existe = await conexion.query('select 1 from pg_namespace where nspname = $1', [esquema]);
  if (existe.rowCount === 0) return;
  const nombre = pg.escapeIdentifier(esquema);
  await conexion.query(`
    grant usage on schema ${nombre} to ${ROL_APLICACION};
    grant select, insert, update, delete on all tables in schema ${nombre} to ${ROL_APLICACION};
    grant usage, select on all sequences in schema ${nombre} to ${ROL_APLICACION};
  `);
}

/**
 * Claves de los módulos que se migran antes que `modulo`: el núcleo y, si el módulo
 * no es esencial, también los esenciales (que siempre están activos) y su `dependeDe`.
 */
function dependenciasDeMigracion(modulo: DefinicionModulo, modulos: readonly DefinicionModulo[]): string[] {
  if (modulo.clave === 'core') return [];
  const esenciales = modulo.esencial ? [] : modulos.filter((m) => m.esencial).map((m) => m.clave);
  return ['core', ...esenciales, ...(modulo.dependeDe ?? [])].filter((clave) => clave !== modulo.clave);
}

/**
 * Ordena los módulos para que cada uno se migre después de los que necesita:
 * primero el núcleo, luego los esenciales y después según `dependeDe` (orden topológico).
 */
export function ordenarPorDependencias(modulos: readonly DefinicionModulo[]): DefinicionModulo[] {
  const porClave = new Map(modulos.map((m) => [m.clave, m]));
  const ordenados: DefinicionModulo[] = [];
  const visitados = new Set<string>();
  const enCurso = new Set<string>();

  const visitar = (modulo: DefinicionModulo) => {
    if (visitados.has(modulo.clave)) return;
    if (enCurso.has(modulo.clave)) throw new Error(`Dependencia circular en el módulo "${modulo.clave}".`);
    enCurso.add(modulo.clave);
    for (const clave of dependenciasDeMigracion(modulo, modulos)) {
      const dependencia = porClave.get(clave);
      if (dependencia) visitar(dependencia);
    }
    enCurso.delete(modulo.clave);
    visitados.add(modulo.clave);
    ordenados.push(modulo);
  };

  modulos.forEach(visitar);
  return ordenados;
}

/**
 * Aplica las migraciones pendientes de cada módulo, en orden de dependencias.
 * Cada módulo lleva su propio control en `drizzle.migraciones_<modulo>`.
 * Se conecta como dueño de las tablas, no con el rol de la aplicación.
 */
export async function migrarModulos(urlPropietario: string, modulos: readonly DefinicionModulo[]): Promise<string[]> {
  const conexion = new pg.Client({ connectionString: urlPropietario });
  await conexion.connect();
  const migrados: string[] = [];
  try {
    const bdPropietario = drizzle(conexion);
    for (const modulo of ordenarPorDependencias(modulos)) {
      const carpeta = join(CARPETA_MODULOS, modulo.clave, 'migraciones');
      if (!existsSync(join(carpeta, 'meta', '_journal.json'))) continue;
      await migrate(bdPropietario, {
        migrationsFolder: carpeta,
        migrationsSchema: 'drizzle',
        migrationsTable: `migraciones_${nombreEsquemaDe(modulo.clave)}`,
      });
      await otorgarPermisosAplicacion(conexion, nombreEsquemaDe(modulo.clave));
      migrados.push(modulo.clave);
    }
  } finally {
    await conexion.end();
  }
  return migrados;
}
