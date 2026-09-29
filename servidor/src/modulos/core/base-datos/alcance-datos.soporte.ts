/**
 * Apoyo de las pruebas de alcance por registro: un esquema `prueba` propio (registros, accesos y
 * una tabla dependiente) con las políticas que construye `alcance.ts`, y sus datos.
 */
import { sql } from 'drizzle-orm';
import { PgDialect, type PgPolicy } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import {
  politicaPorAlcanceOpcional,
  politicasDeTablaDeAccesos,
  politicasDelRegistroConAlcance,
  type AlcanceDeRegistros,
} from './alcance.js';
import { bd, grupoConexiones } from './conexion.js';
import { migrarModulos } from './migrador.js';

export const ALCANCE: AlcanceDeRegistros = {
  recurso: 'prueba.registros',
  tablaDeAccesos: 'prueba.accesos_a_registros',
  tablaDelRegistro: 'prueba.registros',
  columna: 'registro_id',
};
export const RECURSO = ALCANCE.recurso;
export const dialecto = new PgDialect();

type Ids = Record<'cuenta' | 'e1' | 'e2' | 'asignado' | 'sinAsignar' | 'otroAsignado' | 'ajeno' | 'r1' | 'r2', string>;
export let ids: Ids;

export async function comoPropietario<T = unknown>(consultas: string): Promise<pg.QueryResult<T & pg.QueryResultRow>> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return await conexion.query(consultas);
  } finally {
    await conexion.end();
  }
}

function sqlDePolitica(tabla: string, politica: PgPolicy): string {
  const texto = (expresion: unknown) => dialecto.sqlToQuery(expresion as ReturnType<typeof sql.raw>).sql;
  const using = politica.using ? ` using (${texto(politica.using)})` : '';
  const conCheck = politica.withCheck ? ` with check (${texto(politica.withCheck)})` : '';
  return `create policy ${politica.name} on ${tabla} as ${politica.as ?? 'permissive'} for ${politica.for ?? 'all'} to arrancar_app${using}${conCheck};`;
}

const politicas = (tabla: string, lista: PgPolicy[]) => lista.map((p) => sqlDePolitica(tabla, p)).join('\n');

async function crearEsquemaDePrueba(): Promise<void> {
  await comoPropietario(`
    drop schema if exists prueba cascade;
    create schema prueba;
    create table prueba.registros (id uuid primary key default gen_random_uuid(), empresa_id uuid not null,
      nombre text not null, unique (id, empresa_id));
    create table prueba.accesos_a_registros (empresa_id uuid not null, usuario_id uuid not null, registro_id uuid not null,
      creado_por uuid, actualizado_por uuid, primary key (empresa_id, usuario_id, registro_id),
      foreign key (empresa_id, usuario_id) references core.empresa_usuarios (empresa_id, usuario_id) on delete cascade,
      foreign key (registro_id, empresa_id) references prueba.registros (id, empresa_id) on delete cascade);
    create table prueba.dependientes (id uuid primary key default gen_random_uuid(), empresa_id uuid not null,
      registro_id uuid, nombre text not null);
    alter table prueba.registros enable row level security;
    alter table prueba.accesos_a_registros enable row level security;
    alter table prueba.dependientes enable row level security;
    ${politicas('prueba.registros', [
      ...politicasDelRegistroConAlcance(ALCANCE),
      ...politicasDeTablaDeAccesos(ALCANCE).slice(0, 1),
    ])}
    ${politicas('prueba.accesos_a_registros', politicasDeTablaDeAccesos(ALCANCE))}
    ${politicas('prueba.dependientes', [politicaPorAlcanceOpcional(ALCANCE, 'registro_id')])}
    create policy por_empresa on prueba.dependientes to arrancar_app
      using (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid)
      with check (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid);
    create trigger asignar_al_creador after insert on prueba.registros for each row
      execute function core.asignar_registro_al_creador('prueba.accesos_a_registros', 'registro_id');
    grant usage on schema prueba to arrancar_app;
    grant select, insert, update, delete on all tables in schema prueba to arrancar_app;
    truncate core.cuentas, core.usuarios cascade;
  `);
}

async function sembrarDatos(): Promise<void> {
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta' }).returning();
  const [e1, e2] = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa 1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa 2' },
    ])
    .returning();
  const nombres = ['asignado', 'sin', 'otro', 'ajeno'];
  const us = await bd
    .insert(usuarios)
    .values(nombres.map((n) => ({ usuario: n, nombres: n, hashContrasena: 'x' })))
    .returning();
  const [asignado, sinAsignar, otroAsignado, ajeno] = us.map((u) => u.id) as [string, string, string, string];
  const r1 = crypto.randomUUID();
  const r2 = crypto.randomUUID();
  ids = { cuenta: cuenta!.id, e1: e1!.id, e2: e2!.id, asignado, sinAsignar, otroAsignado, ajeno, r1, r2 };
  await comoPropietario(`
    insert into core.empresa_usuarios (empresa_id, usuario_id)
      select '${ids.e1}', u from unnest(array['${asignado}', '${sinAsignar}', '${otroAsignado}']::uuid[]) u;
    insert into prueba.registros (id, empresa_id, nombre) values
      ('${r1}', '${ids.e1}', 'Uno'), ('${r2}', '${ids.e1}', 'Dos'), (gen_random_uuid(), '${ids.e2}', 'De otra empresa');
    insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values
      ('${ids.e1}', '${asignado}', '${r1}'), ('${ids.e1}', '${otroAsignado}', '${r2}');
    insert into prueba.dependientes (empresa_id, registro_id, nombre) values
      ('${ids.e1}', '${r1}', 'dep-uno'), ('${ids.e1}', '${r2}', 'dep-dos'), ('${ids.e1}', null, 'dep-libre');
  `);
}

export const como = (usuarioId: string, recursosAlcanceTotal: string[] = [], empresaId = ids.e1) => ({
  empresaId,
  cuentaId: ids.cuenta,
  usuarioId,
  recursosAlcanceTotal,
});

/** Contexto de la ventana de asignación: lo que fija `operadorParaAsignar`. */
export const paraAsignar = (usuarioId: string, empresaId = ids.e1) => ({
  ...como(usuarioId, [], empresaId),
  recursosParaAsignar: [RECURSO],
});

export const nombres = async (contexto: ReturnType<typeof como>, tabla = 'prueba.registros') => {
  const filas = await enTransaccionSegura(contexto, (tx) =>
    tx.execute<{ nombre: string }>(sql.raw(`select nombre from ${tabla} order by nombre`)),
  );
  return filas.rows.map((f) => f.nombre);
};

export async function prepararEsquemaDePrueba(): Promise<void> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await crearEsquemaDePrueba();
  await sembrarDatos();
}

export async function borrarEsquemaDePrueba(): Promise<void> {
  await comoPropietario('drop schema if exists prueba cascade;');
  await grupoConexiones.end();
}
