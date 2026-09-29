/**
 * Prueba de integración del alcance por registro: las políticas que construye `alcance.ts`
 * sobre un esquema `prueba` propio (registros, accesos y una tabla dependiente) muestran solo
 * lo asignado al usuario, salvo alcance total; el disparador asigna al creador.
 */
import { sql } from 'drizzle-orm';
import { PgDialect, type PgPolicy } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import {
  politicaPorAlcance,
  politicaPorAlcanceOpcional,
  politicasDeTablaDeAccesos,
  politicasDelRegistroConAlcance,
  type AlcanceDeRegistros,
} from './alcance.js';
import { bd, grupoConexiones } from './conexion.js';
import { migrarModulos } from './migrador.js';

const ALCANCE: AlcanceDeRegistros = {
  recurso: 'prueba.registros',
  tablaDeAccesos: 'prueba.accesos_a_registros',
  tablaDelRegistro: 'prueba.registros',
  columna: 'registro_id',
};
const RECURSO = ALCANCE.recurso;
const dialecto = new PgDialect();

type Ids = Record<'cuenta' | 'e1' | 'e2' | 'asignado' | 'sinAsignar' | 'otroAsignado' | 'ajeno' | 'r1' | 'r2', string>;
let ids: Ids;

async function comoPropietario<T = unknown>(consultas: string): Promise<pg.QueryResult<T & pg.QueryResultRow>> {
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
    insert into core.roles (id, cuenta_id, nombre) values ('${r1}', '${ids.cuenta}', 'Rol');
    insert into core.empresa_usuarios (empresa_id, usuario_id, rol_id)
      select '${ids.e1}', u, '${r1}' from unnest(array['${asignado}', '${sinAsignar}', '${otroAsignado}']::uuid[]) u;
    insert into prueba.registros (id, empresa_id, nombre) values
      ('${r1}', '${ids.e1}', 'Uno'), ('${r2}', '${ids.e1}', 'Dos'), (gen_random_uuid(), '${ids.e2}', 'De otra empresa');
    insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values
      ('${ids.e1}', '${asignado}', '${r1}'), ('${ids.e1}', '${otroAsignado}', '${r2}');
    insert into prueba.dependientes (empresa_id, registro_id, nombre) values
      ('${ids.e1}', '${r1}', 'dep-uno'), ('${ids.e1}', '${r2}', 'dep-dos'), ('${ids.e1}', null, 'dep-libre');
  `);
}

const como = (usuarioId: string, recursosAlcanceTotal: string[] = [], empresaId = ids.e1) => ({
  empresaId,
  cuentaId: ids.cuenta,
  usuarioId,
  recursosAlcanceTotal,
});

const nombres = async (contexto: ReturnType<typeof como>, tabla = 'prueba.registros') => {
  const filas = await enTransaccionSegura(contexto, (tx) =>
    tx.execute<{ nombre: string }>(sql.raw(`select nombre from ${tabla} order by nombre`)),
  );
  return filas.rows.map((f) => f.nombre);
};

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await crearEsquemaDePrueba();
  await sembrarDatos();
});

afterAll(async () => {
  await comoPropietario('drop schema if exists prueba cascade;');
  await grupoConexiones.end();
});

describe('alcance por registro (RLS)', () => {
  it('el usuario solo ve los registros que tiene asignados', async () => {
    expect(await nombres(como(ids.asignado))).toEqual(['Uno']);
  });

  it('un usuario sin asignaciones no ve ningún registro', async () => {
    expect(await nombres(como(ids.sinAsignar))).toEqual([]);
  });

  it('con alcance total sobre el recurso ve todos los registros de la empresa', async () => {
    expect(await nombres(como(ids.sinAsignar, [RECURSO]))).toEqual(['Dos', 'Uno']);
  });

  it('el alcance total de otro recurso no sirve para este', async () => {
    expect(await nombres(como(ids.sinAsignar, ['otro.recurso']))).toEqual([]);
  });

  it('otra empresa no muestra nada, ni con alcance total', async () => {
    expect(await nombres(como(ids.asignado, [], ids.e2))).toEqual([]);
  });

  it('no puede cambiar ni borrar registros que no tiene asignados', async () => {
    const resultado = await enTransaccionSegura(como(ids.asignado), async (tx) => {
      const cambiados = await tx.execute(
        sql`update prueba.registros set nombre = 'X' where nombre = 'Dos' returning id`,
      );
      const borrados = await tx.execute(sql`delete from prueba.registros where nombre = 'Dos' returning id`);
      return [cambiados.rows.length, borrados.rows.length];
    });
    expect(resultado).toEqual([0, 0]);
  });

  it('un dependiente con columna opcional muestra los nulos y los de registros visibles', async () => {
    expect(await nombres(como(ids.asignado), 'prueba.dependientes')).toEqual(['dep-libre', 'dep-uno']);
  });

  it('un dependiente no puede apuntar a un registro que el usuario no ve', async () => {
    const intento = enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`insert into prueba.dependientes (empresa_id, registro_id, nombre) values (${ids.e1}, ${ids.r2}, 'intruso')`,
      ),
    );
    await expect(intento).rejects.toThrow();
  });

  it('la política de una tabla dependiente obligatoria también filtra por alcance', () => {
    const politica = politicaPorAlcance(ALCANCE, 'registro_id');
    expect(politica.name).toBe('alcance_prueba_registros');
    expect(dialecto.sqlToQuery(politica.using as ReturnType<typeof sql.raw>).sql).not.toContain('is null');
  });
});

describe('asignaciones', () => {
  it('quien no es miembro de la empresa no puede recibir asignaciones', async () => {
    const intento = enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values (${ids.e1}, ${ids.ajeno}, ${ids.r1})`,
      ),
    );
    await expect(intento).rejects.toThrow();
  });

  it('puede asignar un registro que ve, y quitarlo', async () => {
    await enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values (${ids.e1}, ${ids.sinAsignar}, ${ids.r1})`,
      ),
    );
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Uno']);
    const quitados = await enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`delete from prueba.accesos_a_registros where usuario_id = ${ids.sinAsignar} returning registro_id`,
      ),
    );
    expect(quitados.rows).toHaveLength(1);
  });

  it('no puede asignar ni quitar un registro que no ve', async () => {
    const asignar = enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values (${ids.e1}, ${ids.sinAsignar}, ${ids.r2})`,
      ),
    );
    await expect(asignar).rejects.toThrow();
    const quitados = await enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`delete from prueba.accesos_a_registros where usuario_id = ${ids.otroAsignado} returning registro_id`,
      ),
    );
    expect(quitados.rows).toHaveLength(0);
  });

  it('con alcance total puede asignar cualquier registro', async () => {
    await enTransaccionSegura(como(ids.sinAsignar, [RECURSO]), (tx) =>
      tx.execute(
        sql`insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values (${ids.e1}, ${ids.sinAsignar}, ${ids.r2})`,
      ),
    );
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Dos']);
    await comoPropietario(`delete from prueba.accesos_a_registros where usuario_id = '${ids.sinAsignar}'`);
  });

  it('leer, insertar y borrar en las tres tablas no provoca recursión de políticas', async () => {
    await enTransaccionSegura(como(ids.asignado), async (tx) => {
      await tx.execute(sql`select * from prueba.accesos_a_registros`);
      await tx.execute(sql`select * from prueba.registros`);
      await tx.execute(sql`delete from prueba.dependientes where nombre = 'no-existe'`);
    });
  });
});

describe('asignar al creador (disparador)', () => {
  const crear = (usuarioId: string, nombre: string) =>
    enTransaccionSegura(como(usuarioId), (tx) =>
      tx.execute(sql`insert into prueba.registros (empresa_id, nombre) values (${ids.e1}, ${nombre})`),
    );

  it('quien crea sin alcance total puede hacerlo, y el registro queda asignado a él', async () => {
    await crear(ids.sinAsignar, 'Creado por sin');
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Creado por sin']);
    expect(await nombres(como(ids.asignado))).toEqual(['Uno']);
  });

  it('quien no es miembro de la empresa (superacceso) crea sin quedar asignado', async () => {
    await crear(ids.ajeno, 'Creado por ajeno');
    const asignados = await comoPropietario(
      `select 1 from prueba.accesos_a_registros where usuario_id = '${ids.ajeno}'`,
    );
    expect(asignados.rows).toHaveLength(0);
  });

  it('sin usuario en la transacción (semillas, migraciones) no asigna a nadie', async () => {
    const antes = await comoPropietario('select count(*)::int as n from prueba.accesos_a_registros');
    await comoPropietario(`insert into prueba.registros (empresa_id, nombre) values ('${ids.e1}', 'De semilla')`);
    const despues = await comoPropietario('select count(*)::int as n from prueba.accesos_a_registros');
    expect(despues.rows[0]).toEqual(antes.rows[0]);
  });
});
