/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): toda tabla de los esquemas de
 * módulo tiene seguridad por filas (RLS) activa, y cada recurso declarado en `recursosConAlcance`
 * tiene su tabla de accesos con las políticas de `alcance.ts` y su tabla protegida con las suyas.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { migrarModulos, nombreEsquemaDe } from './migrador.js';

let conexion: pg.Client;

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
});

afterAll(async () => {
  await conexion.end();
});

const politicasDe = async (tabla: string): Promise<string[]> => {
  const [esquema, nombre] = tabla.split('.');
  const { rows } = await conexion.query<{ policyname: string }>(
    'select policyname from pg_policies where schemaname = $1 and tablename = $2 order by policyname',
    [esquema, nombre],
  );
  return rows.map((fila) => fila.policyname);
};

describe('seguridad por filas de los esquemas de módulo', () => {
  it('toda tabla de un módulo tiene RLS activa', async () => {
    const esquemas = definicionesModulos
      .filter(({ clave }) => clave !== 'core')
      .map(({ clave }) => nombreEsquemaDe(clave));
    const { rows } = await conexion.query<{ tabla: string }>(
      `select n.nspname || '.' || c.relname as tabla from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where c.relkind = 'r' and n.nspname = any($1) and not c.relrowsecurity`,
      [esquemas],
    );

    expect(rows.map((fila) => fila.tabla)).toEqual([]);
  });

  it('cada recurso con alcance tiene su tabla de accesos y su tabla protegida con sus políticas', async () => {
    const recursos = definicionesModulos.flatMap((modulo) => modulo.recursosConAlcance ?? []);

    expect(recursos.length).toBeGreaterThan(0);
    for (const { alcance } of recursos) {
      expect(await politicasDe(alcance.tablaDeAccesos)).toEqual([
        'aislamiento_por_empresa',
        'asignar_para_asignar',
        'cambiar_para_asignar',
        'quitar_para_asignar',
      ]);
      expect(await politicasDe(alcance.tablaDelRegistro)).toEqual(
        expect.arrayContaining(['aislamiento_por_empresa', 'alcance_ver', 'alcance_cambiar', 'alcance_eliminar']),
      );
    }
  });
});
