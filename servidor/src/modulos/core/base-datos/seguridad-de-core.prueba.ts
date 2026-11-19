/**
 * Prueba de integración contra PostgreSQL: defensa en profundidad de las tablas de `core`
 * (`docs/modulos/diseno-rls-de-core.md`). Cada tabla está clasificada, el migrador deja los privilegios de
 * `arrancar_app` que dice el mapa (también al migrar dos veces) y los disparadores impiden lo que el código nunca hace.
 */
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { interpretarErrorDePostgres } from '../compartido/infraestructura/errores-de-postgres.js';
import { grupoConexiones } from './conexion.js';
import { migrarModulos } from './migrador.js';
import { RESTRICCIONES_DE_PRIVILEGIOS } from './privilegios-restringidos.js';

/** Tablas de `core` con RLS (las seis de R-3 son de escritura por cuenta). Las demás, solo con privilegios (§4 del diseño). */
const CON_RLS = [
  'archivos',
  'auditoria',
  'correlativos',
  'empresas',
  'empresa_usuarios',
  'roles',
  'rol_permisos',
  'usuario_roles',
  'usuario_permisos',
  'recursos_de_auditoria_permanente',
  'correos_salientes',
  'destinatarios_de_correos',
  'intentos_de_correos',
];

const TODOS = ['delete', 'insert', 'select', 'update'];
let propietario: pg.Client;
let aplicacion: pg.Client;
let cuentaId: string;
let empresaId: string;
let rolId: string;

async function codigoDeError(consulta: Promise<unknown>): Promise<string | undefined> {
  try {
    await consulta;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

const unaFila = async (consulta: string, valores: unknown[] = []): Promise<string> =>
  (await propietario.query<{ id: string }>(consulta, valores)).rows[0]!.id;

async function tablasDeCore(): Promise<{ tabla: string; rls: boolean }[]> {
  const { rows } = await propietario.query<{ tabla: string; rls: boolean }>(
    `select c.relname as tabla, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'core' and c.relkind = 'r' order by 1`,
  );
  return rows;
}

async function privilegiosDeTabla(tabla: string): Promise<string[]> {
  const { rows } = await propietario.query<{ p: string }>(
    `select lower(privilege_type) as p from information_schema.role_table_grants
     where table_schema = 'core' and table_name = $1 and grantee = 'arrancar_app' order by 1`,
    [tabla],
  );
  return rows.map((fila) => fila.p);
}

async function columnasActualizables(tabla: string): Promise<string[]> {
  const { rows } = await propietario.query<{ columna: string }>(
    `select column_name as columna from information_schema.column_privileges
     where table_schema = 'core' and table_name = $1 and grantee = 'arrancar_app' and privilege_type = 'UPDATE'
     order by 1`,
    [tabla],
  );
  return rows.map((fila) => fila.columna);
}

function esperadoDe(tabla: string): { tabla: string[]; columnas: string[] | null } {
  const restriccion = RESTRICCIONES_DE_PRIVILEGIOS[`core.${tabla}`];
  const sin = new Set<string>(restriccion?.sin ?? []);
  if (restriccion?.actualizarSolo) sin.add('update');
  return { tabla: TODOS.filter((p) => !sin.has(p)), columnas: restriccion?.actualizarSolo?.toSorted() ?? null };
}

async function revisarPrivilegios(): Promise<void> {
  for (const { tabla } of await tablasDeCore()) {
    const esperado = esperadoDe(tabla);
    expect(await privilegiosDeTabla(tabla), `privilegios de core.${tabla}`).toEqual(esperado.tabla);
    if (esperado.columnas)
      expect(await columnasActualizables(tabla), `columnas de core.${tabla}`).toEqual(esperado.columnas);
  }
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  aplicacion = new pg.Client({ connectionString: configuracion.DATABASE_URL });
  await propietario.connect();
  await aplicacion.connect();
  cuentaId = await unaFila(`insert into core.cuentas (nombre) values ('Seguridad de core') returning id`);
  empresaId = await unaFila(`insert into core.empresas (cuenta_id, nombre) values ($1, 'E') returning id`, [cuentaId]);
  rolId = await unaFila(`insert into core.roles (cuenta_id, nombre) values ($1, 'R') returning id`, [cuentaId]);
});

afterAll(async () => {
  await propietario.query(`delete from core.usuarios where usuario like 'seguridadcore%'`);
  await propietario.query('delete from core.cuentas where id = $1', [cuentaId]);
  await propietario.end();
  await aplicacion.end();
  await grupoConexiones.end();
});

describe('clasificación de las tablas de core', () => {
  it('toda tabla de core está en el mapa de privilegios y el mapa no tiene tablas que no existen', async () => {
    const existentes = (await tablasDeCore()).map((fila) => `core.${fila.tabla}`).sort();

    expect(Object.keys(RESTRICCIONES_DE_PRIVILEGIOS).sort()).toEqual(existentes);
  });

  it('solo las tablas esperadas tienen RLS', async () => {
    const conRls = (await tablasDeCore()).filter((fila) => fila.rls).map((fila) => fila.tabla);

    expect(conRls.sort()).toEqual([...CON_RLS].sort());
  });
});

describe('privilegios de arrancar_app', () => {
  it('coinciden con el mapa, también tras migrar dos veces', async () => {
    await revisarPrivilegios();
    await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
    await revisarPrivilegios();
  });

  it('no puede borrar empresas ni cuentas, ni cambiar a qué cuenta pertenece una empresa ni cuándo se creó', async () => {
    const intentos: [string, unknown[]][] = [
      ['delete from core.empresas where id = $1', [empresaId]],
      ['delete from core.cuentas where id = $1', [cuentaId]],
      ['update core.empresas set cuenta_id = $1 where id = $2', [randomUUID(), empresaId]],
      ['update core.empresas set creado_en = now() where id = $1', [empresaId]],
    ];

    for (const [consulta, valores] of intentos) {
      expect(await codigoDeError(aplicacion.query(consulta, valores)), consulta).toBe('42501');
    }
  });

  it('sí edita nombre, NIT y estado de la empresa', async () => {
    const edicion = aplicacion.query(
      `update core.empresas set nombre = 'Editada', nit = '1234567-8', activa = false, actualizado_en = now() where id = $1`,
      [empresaId],
    );

    expect(await codigoDeError(edicion)).toBeUndefined();
  });

  it('la bitácora de superacceso y la auditoría solo crecen', async () => {
    for (const tabla of ['bitacora_superacceso', 'auditoria']) {
      expect(await codigoDeError(aplicacion.query(`update core.${tabla} set creado_en = now()`))).toBe('42501');
      expect(await codigoDeError(aplicacion.query(`delete from core.${tabla}`))).toBe('42501');
    }
  });

  it('los catálogos de geografía los siembra la migración: la aplicación no escribe en ellos', async () => {
    const insertar = aplicacion.query(`insert into core.departamentos (codigo, nombre) values ('99', 'Inventado')`);
    const borrar = aplicacion.query('delete from core.municipios');

    expect(await codigoDeError(insertar)).toBe('42501');
    expect(await codigoDeError(borrar)).toBe('42501');
  });

  it('un privilegio negado llega como fallo inesperado, no como «no encontrado»', async () => {
    const error = await aplicacion.query('delete from core.empresas').catch((fallo: unknown) => fallo);

    expect(interpretarErrorDePostgres(error)).toBeNull();
  });

  it('las columnas de un usuario que nunca cambian no se pueden actualizar', async () => {
    for (const columna of ['usuario', 'es_superacceso', 'creado_en', 'id']) {
      const intento = aplicacion.query(`update core.usuarios set ${columna} = ${columna} where false`);
      expect(await codigoDeError(intento), columna).toBe('42501');
    }
  });
});

describe('usuarios de superacceso', () => {
  const insertar = (cliente: pg.Client, usuario: string, superacceso: boolean) =>
    cliente.query(
      `insert into core.usuarios (usuario, nombres, hash_contrasena, es_superacceso) values ($1, 'S', 'x', $2)`,
      [usuario, superacceso],
    );

  it('la aplicación crea usuarios normales pero no superacceso; el dueño sí', async () => {
    expect(await codigoDeError(insertar(aplicacion, 'seguridadcorea', false))).toBeUndefined();
    expect(await codigoDeError(insertar(aplicacion, 'seguridadcoreb', true))).toBe('42501');
    expect(await codigoDeError(insertar(propietario, 'seguridadcorec', true))).toBeUndefined();
  });

  it('la aplicación no puede volver superacceso a un usuario existente', async () => {
    const promover = aplicacion.query(
      `update core.usuarios set es_superacceso = true where usuario = 'seguridadcorea'`,
    );

    expect(await codigoDeError(promover)).toBe('42501');
  });
});

describe('columnas fijas (disparadores, valen también para el dueño)', () => {
  const restriccionDe = async (consulta: string, valores: unknown[]) =>
    propietario.query(consulta, valores).then(
      () => undefined,
      (error: { constraint?: string }) => error.constraint,
    );

  it('una empresa no cambia de cuenta, de id ni de fecha de creación', async () => {
    const otraCuenta = await unaFila(`insert into core.cuentas (nombre) values ('Otra') returning id`);

    const cuenta = await restriccionDe('update core.empresas set cuenta_id = $1 where id = $2', [
      otraCuenta,
      empresaId,
    ]);
    const creada = await restriccionDe('update core.empresas set creado_en = now() where id = $1', [empresaId]);
    const identidad = await restriccionDe('update core.empresas set id = $1 where id = $2', [randomUUID(), empresaId]);

    expect([cuenta, creada, identidad]).toEqual(Array(3).fill('empresas_columnas_fijas'));
    await propietario.query('delete from core.cuentas where id = $1', [otraCuenta]);
  });

  it('un rol no cambia de cuenta', async () => {
    const otraCuenta = await unaFila(`insert into core.cuentas (nombre) values ('Otra') returning id`);

    const intento = await restriccionDe('update core.roles set cuenta_id = $1 where id = $2', [otraCuenta, rolId]);

    expect(intento).toBe('roles_columnas_fijas');
    await propietario.query('delete from core.cuentas where id = $1', [otraCuenta]);
  });

  it('lo que sí se edita sigue funcionando', async () => {
    const nombre = await propietario.query(`update core.empresas set nombre = 'Otro nombre' where id = $1`, [
      empresaId,
    ]);
    const rol = await propietario.query(`update core.roles set nombre = 'Otro rol' where id = $1`, [rolId]);

    expect([nombre.rowCount, rol.rowCount]).toEqual([1, 1]);
  });
});
