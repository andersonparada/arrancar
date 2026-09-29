/**
 * La migración 0017 pasa los roles de cada empresa a la cuenta: se carga la forma antigua
 * (`empresa_usuarios.rol_id`) y se ejecuta el SQL de la migración sobre esos datos.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { migrarModulos } from './migrador.js';

const SQL_DE_LA_MIGRACION = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migraciones',
  '0017_roles_de_la_empresa_a_la_cuenta.sql',
);

let conexion: pg.Client;
let cuentaId: string;
const usuarios: Record<string, string> = {};
const roles: Record<string, string> = {};

const id = async (consulta: string, parametros: unknown[] = []): Promise<string> => {
  const { rows } = await conexion.query<{ id: string }>(consulta, parametros);
  return rows[0]!.id;
};

/** La 0018 quitó `rol_id`: se devuelve solo para cargar la forma antigua, y se quita al terminar. */
const RESTAURAR_COLUMNA = 'alter table core.empresa_usuarios add column if not exists rol_id uuid';
const QUITAR_COLUMNA = 'alter table core.empresa_usuarios drop column if exists rol_id';

async function cargarDatosAntiguos(): Promise<void> {
  await conexion.query(RESTAURAR_COLUMNA);
  cuentaId = await id(`insert into core.cuentas (nombre) values ('Migración de roles') returning id`);
  const e1 = await id(`insert into core.empresas (cuenta_id, nombre) values ($1, 'Finca A') returning id`, [cuentaId]);
  const e2 = await id(`insert into core.empresas (cuenta_id, nombre) values ($1, 'Finca B') returning id`, [cuentaId]);
  for (const nombre of ['Contador', 'Bodega', 'Editor']) {
    roles[nombre] = await id(`insert into core.roles (cuenta_id, nombre) values ($1, $2) returning id`, [
      cuentaId,
      nombre,
    ]);
  }
  await conexion.query(
    `insert into core.rol_permisos (rol_id, permiso) values ($1, 'usuarios.editar'), ($2, 'usuarios.ver')`,
    [roles.Editor, roles.Bodega],
  );
  for (const nombre of ['igual', 'distinto', 'editor']) {
    usuarios[nombre] = await id(
      `insert into core.usuarios (usuario, nombres, apellidos, hash_contrasena) values ($1, $1, 'Prueba', 'x') returning id`,
      [`migracion${nombre}`],
    );
  }
  const filas: [string, string, string][] = [
    [e1, usuarios.igual!, roles.Contador!],
    [e2, usuarios.igual!, roles.Contador!],
    [e1, usuarios.distinto!, roles.Contador!],
    [e2, usuarios.distinto!, roles.Bodega!],
    [e1, usuarios.editor!, roles.Editor!],
  ];
  for (const [empresa, usuario, rol] of filas) {
    await conexion.query('insert into core.empresa_usuarios (empresa_id, usuario_id, rol_id) values ($1, $2, $3)', [
      empresa,
      usuario,
      rol,
    ]);
  }
}

async function ejecutarLaMigracion(): Promise<void> {
  for (const sentencia of readFileSync(SQL_DE_LA_MIGRACION, 'utf8').split('--> statement-breakpoint')) {
    await conexion.query(sentencia);
  }
}

async function limpiar(): Promise<void> {
  await conexion.query('delete from core.auditoria where cuenta_id = $1', [cuentaId]);
  await conexion.query('delete from core.usuario_roles where cuenta_id = $1', [cuentaId]);
  await conexion.query('delete from core.cuentas where id = $1', [cuentaId]);
  await conexion.query(QUITAR_COLUMNA);
  await conexion.query(`delete from core.usuarios where usuario like 'migracion%'`);
}

const rolesDe = async (usuarioId: string): Promise<string[]> => {
  const { rows } = await conexion.query<{ nombre: string }>(
    `select r.nombre from core.usuario_roles ur join core.roles r on r.id = ur.rol_id
     where ur.usuario_id = $1 order by r.nombre`,
    [usuarioId],
  );
  return rows.map((fila) => fila.nombre);
};

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await cargarDatosAntiguos();
  await ejecutarLaMigracion();
});

afterAll(async () => {
  await limpiar();
  await conexion.end();
});

describe('migración de los roles de la empresa a la cuenta', () => {
  it('el mismo rol en dos empresas queda una sola vez', async () => {
    expect(await rolesDe(usuarios.igual!)).toEqual(['Contador']);
  });

  it('roles distintos según la empresa quedan todos, y la auditoría lo anota', async () => {
    expect(await rolesDe(usuarios.distinto!)).toEqual(['Bodega', 'Contador']);
    const { rows } = await conexion.query(
      `select accion from core.auditoria where cuenta_id = $1 and recurso = 'core.roles-de-usuario' and registro_id = $2`,
      [cuentaId, usuarios.distinto],
    );
    expect(rows).toEqual([{ accion: 'asignar' }]);
  });

  it('no anota en la auditoría a quien tenía el mismo rol en todas sus empresas', async () => {
    const { rowCount } = await conexion.query(
      `select 1 from core.auditoria where cuenta_id = $1 and registro_id = $2`,
      [cuentaId, usuarios.igual],
    );
    expect(rowCount).toBe(0);
  });

  it('quien podía editar usuarios recibe el permiso de asignar permisos', async () => {
    const { rows } = await conexion.query<{ permiso: string }>(
      `select permiso from core.rol_permisos where rol_id = $1 order by permiso`,
      [roles.Editor],
    );
    expect(rows.map((fila) => fila.permiso)).toEqual(['usuarios.asignar-permisos', 'usuarios.editar']);
  });

  it('un rol sin esos permisos no recibe el nuevo', async () => {
    const { rows } = await conexion.query(
      `select 1 from core.rol_permisos where rol_id = $1 and permiso = 'usuarios.asignar-permisos'`,
      [roles.Bodega],
    );
    expect(rows).toHaveLength(0);
  });
});
