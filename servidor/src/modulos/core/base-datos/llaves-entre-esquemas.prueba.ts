/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): las llaves foráneas entre
 * esquemas solo pueden apuntar a `core`, a un módulo esencial o a un módulo del `dependeDe`
 * (directo o por otro módulo) del dueño de la tabla. Así el migrador, que aplica los módulos en
 * ese orden, siempre encuentra la tabla a la que se apunta (docs/PLAN.md §3.2).
 */
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import type { DefinicionModulo } from '../modulos-sistema/definicion-modulo.js';
import { migrarModulos, nombreEsquemaDe } from './migrador.js';

interface LlaveEntreEsquemas {
  origen: string;
  tabla: string;
  destino: string;
  tablaDestino: string;
  llave: string;
}

/** Los módulos de los que `clave` depende, directamente o a través de otros. */
function dependenciasTransitivas(clave: string, modulos: readonly DefinicionModulo[]): Set<string> {
  const porClave = new Map(modulos.map((modulo) => [modulo.clave, modulo]));
  const pendientes = [...(porClave.get(clave)?.dependeDe ?? [])];
  const encontradas = new Set<string>();
  for (let actual = pendientes.pop(); actual !== undefined; actual = pendientes.pop()) {
    if (encontradas.has(actual)) continue;
    encontradas.add(actual);
    pendientes.push(...(porClave.get(actual)?.dependeDe ?? []));
  }
  return encontradas;
}

/** Las llaves que apuntan a un esquema al que su dueño no puede llegar. */
function llavesNoPermitidas(
  llaves: readonly LlaveEntreEsquemas[],
  modulos: readonly DefinicionModulo[],
): LlaveEntreEsquemas[] {
  const claveDe = new Map(modulos.map((modulo) => [nombreEsquemaDe(modulo.clave), modulo.clave]));
  return llaves.filter(({ origen, destino }) => {
    const moduloOrigen = claveDe.get(origen);
    const moduloDestino = claveDe.get(destino);
    if (!moduloOrigen || !moduloDestino || moduloDestino === 'core') return false;
    const esencial = modulos.find((modulo) => modulo.clave === moduloDestino)?.esencial === true;
    return !esencial && !dependenciasTransitivas(moduloOrigen, modulos).has(moduloDestino);
  });
}

const modulo = (clave: string, dependeDe: string[] = [], esencial = false): DefinicionModulo => ({
  clave,
  nombre: clave,
  descripcion: '',
  permisos: [],
  dependeDe,
  esencial,
});

const llave = (origen: string, destino: string): LlaveEntreEsquemas => ({
  origen,
  tabla: 'a',
  destino,
  tablaDestino: 'b',
  llave: 'a_b_fk',
});

describe('la regla de llaves entre esquemas', () => {
  const modulos = [
    modulo('core'),
    modulo('empresas', [], true),
    modulo('bancos'),
    modulo('cheques', ['bancos']),
    modulo('caja', ['cheques']),
  ];

  it('permite core, los esenciales y los módulos de dependeDe, también los transitivos', () => {
    const permitidas = [llave('bancos', 'core'), llave('bancos', 'empresas'), llave('caja', 'cheques')];

    expect(llavesNoPermitidas([...permitidas, llave('caja', 'bancos')], modulos)).toEqual([]);
  });

  it('rechaza apuntar a un módulo que no está en dependeDe', () => {
    expect(llavesNoPermitidas([llave('bancos', 'cheques'), llave('cheques', 'caja')], modulos)).toHaveLength(2);
  });
});

describe('llaves foráneas entre esquemas de la base migrada', () => {
  let llaves: LlaveEntreEsquemas[];

  beforeAll(async () => {
    await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    const { rows } = await conexion.query<LlaveEntreEsquemas>(
      `select n_origen.nspname as origen, c_origen.relname as tabla,
              n_destino.nspname as destino, c_destino.relname as "tablaDestino", f.conname as llave
       from pg_constraint f
       join pg_class c_origen on c_origen.oid = f.conrelid
       join pg_namespace n_origen on n_origen.oid = c_origen.relnamespace
       join pg_class c_destino on c_destino.oid = f.confrelid
       join pg_namespace n_destino on n_destino.oid = c_destino.relnamespace
       where f.contype = 'f' and n_origen.nspname <> n_destino.nspname and n_origen.nspname = any($1)`,
      [definicionesModulos.map((definicion) => nombreEsquemaDe(definicion.clave))],
    );
    llaves = rows;
    await conexion.end();
  });

  it('cada una apunta a core, a un módulo esencial o a un módulo de su dependeDe', () => {
    expect(llaves.length).toBeGreaterThan(0);
    expect(llavesNoPermitidas(llaves, definicionesModulos)).toEqual([]);
  });
});
