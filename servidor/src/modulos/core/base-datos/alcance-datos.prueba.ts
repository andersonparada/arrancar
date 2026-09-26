/**
 * Prueba de integración del permiso de datos: una tabla protegida con
 * `politicaPorAlcance` solo muestra los registros asignados al usuario en
 * `core.accesos_datos`, salvo que tenga alcance total sobre el recurso.
 * La tabla de prueba se crea con el SQL que genera la propia función.
 */
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { accesosDatos } from '../esquemas/accesos-datos.esquema.js';
import { cuentas } from '../esquemas/cuentas.esquema.js';
import { empresas } from '../esquemas/empresas.esquema.js';
import { usuarios } from '../esquemas/usuarios.esquema.js';
import { politicaPorAlcance } from './columnas.js';
import { bd, grupoConexiones } from './conexion.js';
import { ejecutarEnEmpresa } from './contexto-empresa.js';
import { migrarModulos } from './migrador.js';

const RECURSO = 'prueba.cuentas';
let empresaId: string;
let cajero: string;
let otroUsuario: string;
let cuentaAsignada: string;

async function comoPropietario(consultas: string): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query(consultas);
  await conexion.end();
}

async function crearTablaProtegida(): Promise<void> {
  const politica = politicaPorAlcance(RECURSO);
  const condicion = new PgDialect().sqlToQuery(politica.using!).sql;
  await comoPropietario(`
    create schema if not exists prueba;
    drop table if exists prueba.cuentas;
    create table prueba.cuentas (id uuid primary key default gen_random_uuid(), empresa_id uuid not null, nombre text not null);
    alter table prueba.cuentas enable row level security;
    create policy por_empresa on prueba.cuentas to arrancar_app
      using (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid)
      with check (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
    create policy alcance on prueba.cuentas as restrictive to arrancar_app using (${condicion}) with check (${condicion});
    grant usage on schema prueba to arrancar_app;
    grant select, insert, update, delete on prueba.cuentas to arrancar_app;
    truncate core.cuentas, core.usuarios cascade;
  `);
}

const nombresVisibles = async (usuarioId: string, recursosAlcanceTotal: string[] = []) => {
  const filas = await ejecutarEnEmpresa({ empresaId, usuarioId, recursosAlcanceTotal }, (tx) =>
    tx.execute<{ nombre: string }>(sql`select nombre from prueba.cuentas order by nombre`),
  );
  return filas.rows.map((f) => f.nombre);
};

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await crearTablaProtegida();

  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta' }).returning();
  const [empresa] = await bd.insert(empresas).values({ cuentaId: cuenta!.id, nombre: 'Empresa' }).returning();
  const [a, b] = await bd
    .insert(usuarios)
    .values([
      { usuario: 'cajero', nombres: 'Cajero', hashContrasena: 'x' },
      { usuario: 'otro', nombres: 'Otro', hashContrasena: 'x' },
    ])
    .returning();
  empresaId = empresa!.id;
  cajero = a!.id;
  otroUsuario = b!.id;

  const creadas = await ejecutarEnEmpresa({ empresaId, usuarioId: cajero, recursosAlcanceTotal: [RECURSO] }, (tx) =>
    tx.execute<{ id: string; nombre: string }>(
      sql`insert into prueba.cuentas (empresa_id, nombre) values (${empresaId}, 'Banrural GTQ'), (${empresaId}, 'Banrural USD') returning id, nombre`,
    ),
  );
  cuentaAsignada = creadas.rows.find((f) => f.nombre === 'Banrural GTQ')!.id;

  await ejecutarEnEmpresa({ empresaId, usuarioId: cajero }, (tx) =>
    tx.insert(accesosDatos).values({ empresaId, usuarioId: cajero, recurso: RECURSO, registroId: cuentaAsignada }),
  );
});

afterAll(async () => {
  await comoPropietario('drop schema if exists prueba cascade;');
  await grupoConexiones.end();
});

describe('permiso de datos por registro (RLS)', () => {
  it('el usuario solo ve los registros que tiene asignados', async () => {
    expect(await nombresVisibles(cajero)).toEqual(['Banrural GTQ']);
  });

  it('un usuario sin asignaciones no ve ningún registro', async () => {
    expect(await nombresVisibles(otroUsuario)).toEqual([]);
  });

  it('con alcance total sobre el recurso ve todos los registros', async () => {
    expect(await nombresVisibles(otroUsuario, [RECURSO])).toEqual(['Banrural GTQ', 'Banrural USD']);
  });

  it('el alcance total de otro recurso no sirve para este', async () => {
    expect(await nombresVisibles(otroUsuario, ['otro.recurso'])).toEqual([]);
  });

  it('no puede modificar registros que no tiene asignados', async () => {
    const actualizadas = await ejecutarEnEmpresa({ empresaId, usuarioId: cajero }, (tx) =>
      tx.execute(sql`update prueba.cuentas set nombre = 'X' where nombre = 'Banrural USD' returning id`),
    );
    expect(actualizadas.rows).toHaveLength(0);
  });
});
