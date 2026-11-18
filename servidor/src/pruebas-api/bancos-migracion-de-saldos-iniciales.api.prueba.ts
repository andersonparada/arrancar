/**
 * BS-1: la parte de datos de la migración 0034 (relleno de los saldos iniciales existentes como «globales», concepto de
 * sistema y permisos). Se deja la base como estaba antes de la migración, se corre el SQL a mano dos veces y se
 * comprueba que ningún saldo, movimiento ni conciliación cambió.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  conceptoGeneral,
  crearCuentaBancaria,
  saldoDe,
  terminarConciliacionConSaldo,
} from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0034_saldos_iniciales_con_partidas.sql', import.meta.url);
const CHECKS = [
  'movimientos_apertura_completa',
  'movimientos_tipo_de_la_parte',
  'movimientos_parte_de_apertura_valida',
];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentas: string[] = [];

/** Las instrucciones de datos (INSERT y UPDATE) de la migración: lo que se corre a mano sobre datos sembrados. */
function instruccionesDeDatos(): string[] {
  return readFileSync(MIGRACION, 'utf8')
    .split('--> statement-breakpoint')
    .map((texto) =>
      texto
        .split('\n')
        .filter((linea) => !linea.startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((texto) => /^(INSERT|UPDATE) /.test(texto));
}

async function conectar(): Promise<pg.Client> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  return conexion;
}

/** Una cuenta conciliada (enero, autorizada) y otra solo con saldo inicial y una nota. */
async function sembrar(): Promise<void> {
  const conceptoId = await conceptoGeneral(cuenta.propietario);
  const autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Apertura',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  const conciliada = await crearCuentaBancaria(cuenta.propietario, 'Cuenta conciliada');
  const sola = await crearCuentaBancaria(cuenta.propietario, 'Cuenta sola');
  cuentas = [conciliada, sola];
  for (const [cuentaBancariaId, tipo, fecha, monto] of [
    [conciliada, 'credito', '2026-01-10', '100.00'],
    [conciliada, 'debito', '2026-01-20', '40.00'],
    [sola, 'credito', '2026-02-10', '25.00'],
  ]) {
    const nota = { cuentaBancariaId, tipo, fecha, monto, conceptoId };
    await cuenta.propietario.post('/api/bancos/notas', {
      ...nota,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
  }
  const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
    cuentaBancariaId: conciliada,
    anio: 2026,
    mes: 1,
  });
  const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
  const ids = (iniciada.cuerpo.candidatos as Array<{ id: string }>).map((candidato) => candidato.id);
  await cuenta.propietario.put(`${ruta}/marcas`, { movimientoIds: ids });
  await terminarConciliacionConSaldo(cuenta.propietario, iniciada.cuerpo.id as string);
  expect((await autoriza.post(`${ruta}/autorizar`, {})).estado).toBe(200);
}

/** Lo que la migración no debe cambiar: movimientos (sin las columnas nuevas ni las marcas) y conciliaciones. */
async function fotoDeLosDatos(): Promise<unknown> {
  const movimientos = await comoPropietario(
    `select id, cuenta_bancaria_id, tipo, fecha, monto, saldo_inicial, concepto_id, conciliacion_id, anulado_en,
            revertido_en, numero from bancos.movimientos where empresa_id = $1 order by id`,
    [cuenta.empresaId],
  );
  const conciliaciones = await comoPropietario(
    'select * from bancos.conciliaciones where empresa_id = $1 order by id',
    [cuenta.empresaId],
  );
  const saldos = await Promise.all(cuentas.map((id) => saldoDe(cuenta.propietario, id)));
  return { movimientos, conciliaciones, saldos };
}

/** Quita los checks de apertura y deja las columnas nuevas vacías, como estaba la base antes de la 0034. */
async function volverAntesDelRelleno(): Promise<Array<{ conname: string; definicion: string }>> {
  const conexion = await conectar();
  const { rows } = await conexion.query(
    `select conname, pg_get_constraintdef(oid) as definicion from pg_constraint
     where conrelid = 'bancos.movimientos'::regclass and conname = any($1)`,
    [CHECKS],
  );
  for (const { conname } of rows) await conexion.query(`alter table bancos.movimientos drop constraint ${conname}`);
  await conexion.query('update bancos.movimientos set parte_de_apertura = null, saldo_inicial_id = null');
  await conexion.query('delete from bancos.saldos_iniciales');
  await conexion.end();
  return rows;
}

async function correrLaMigracionDeDatos(checks: Array<{ conname: string; definicion: string }>): Promise<void> {
  const conexion = await conectar();
  for (const instruccion of instruccionesDeDatos()) await conexion.query(instruccion);
  for (const { conname, definicion } of checks) {
    await conexion.query(`alter table bancos.movimientos add constraint ${conname} ${definicion}`);
  }
  await conexion.end();
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Migra apertura',
    usuario: 'propietariomigraapertura',
    modulos: ['bancos'],
  });
  await sembrar();
});

describe('migración 0034: los saldos iniciales existentes quedan como globales', () => {
  it('cada uno cuelga de una cabecera por cuenta, sin cambiar saldos, movimientos ni conciliaciones, y es repetible', async () => {
    const antes = await fotoDeLosDatos();
    const checks = await volverAntesDelRelleno();
    await correrLaMigracionDeDatos(checks);
    const unaVez = await fotoDeLosDatos();
    await correrLaMigracionDeDatos([]);

    expect(unaVez).toEqual(antes);
    expect(await fotoDeLosDatos()).toEqual(antes);
    const globales = await comoPropietario<{
      cuenta_bancaria_id: string;
      saldo_segun_libros_anteriores: string | null;
    }>(
      `select m.cuenta_bancaria_id, s.saldo_segun_libros_anteriores from bancos.movimientos m
       join bancos.saldos_iniciales s on s.id = m.saldo_inicial_id
       where m.empresa_id = $1 and m.saldo_inicial and m.parte_de_apertura = 'saldo_global'`,
      [cuenta.empresaId],
    );
    expect(globales.map((fila) => fila.cuenta_bancaria_id).sort()).toEqual([...cuentas].sort());
    expect(globales.every((fila) => fila.saldo_segun_libros_anteriores === null)).toBe(true);
    const cabeceras = await comoPropietario('select 1 from bancos.saldos_iniciales where empresa_id = $1', [
      cuenta.empresaId,
    ]);
    expect(cabeceras).toHaveLength(2);
    const sinParte = await comoPropietario(
      'select 1 from bancos.movimientos where empresa_id = $1 and parte_de_apertura is not null and not saldo_inicial',
      [cuenta.empresaId],
    );
    expect(sinParte).toEqual([]);
  });

  it('el saldo inicial que se registra con el código de hoy también cuelga de su cabecera, y se va con ella al eliminarlo', async () => {
    const cuentaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta bandera');
    const cabeceras = () =>
      comoPropietario('select 1 from bancos.saldos_iniciales where cuenta_bancaria_id = $1', [cuentaId]);
    expect(await cabeceras()).toHaveLength(1);
    const lista = await cuenta.propietario.get(`/api/bancos/saldos-iniciales?cuentaBancariaId=${cuentaId}`);
    const id = (lista.cuerpo as Array<{ id: string }>)[0]!.id;
    const eliminado = await cuenta.propietario.delete(`/api/bancos/saldos-iniciales/${id}`, { motivo: 'prueba' });
    expect(eliminado.estado).toBe(204);
    expect(await cabeceras()).toEqual([]);
  });
});

describe('migración 0034: concepto de sistema y permisos', () => {
  const clave = 'anulacion_de_apertura';
  const conceptosDeApertura = () =>
    comoPropietario<{ clave_de_sistema: string | null }>(
      `select clave_de_sistema from bancos.conceptos where empresa_id = $1 and lower(nombre) = 'partidas de apertura anuladas'`,
      [cuenta.empresaId],
    );

  it('crea el concepto si falta, le pone la clave si ya existía con ese nombre y nunca lo duplica', async () => {
    await comoPropietario('delete from bancos.conceptos where empresa_id = $1 and clave_de_sistema = $2', [
      cuenta.empresaId,
      clave,
    ]);
    await correrLaMigracionDeDatos([]);
    await correrLaMigracionDeDatos([]);
    expect(await conceptosDeApertura()).toEqual([{ clave_de_sistema: clave }]);

    await comoPropietario(
      'update bancos.conceptos set clave_de_sistema = null where empresa_id = $1 and clave_de_sistema = $2',
      [cuenta.empresaId, clave],
    );
    await correrLaMigracionDeDatos([]);
    expect(await conceptosDeApertura()).toEqual([{ clave_de_sistema: clave }]);
  });

  it('da «ver» a quien veía las cuentas y «anular» a quien anulaba cheques, por rol y por usuario, y a nadie más', async () => {
    const usuarios = {
      editor: ['bancos.cheques.anular'],
      lector: ['bancos.cuentas-bancarias.ver'],
      ajeno: ['bancos.notas.ver'],
    };
    for (const [nombre, permisos] of Object.entries(usuarios)) {
      await crearUsuarioConPermisos(entorno, cuenta, { nombres: nombre, apellidos: 'Migra', permisos });
    }
    const [dueno] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      cuenta.usuario,
    ]);
    for (const permiso of ['bancos.cheques.anular', 'bancos.cuentas-bancarias.ver']) {
      await comoPropietario('insert into core.usuario_permisos (cuenta_id, usuario_id, permiso) values ($1, $2, $3)', [
        cuenta.cuentaId,
        dueno!.id,
        permiso,
      ]);
    }
    await correrLaMigracionDeDatos([]);
    await correrLaMigracionDeDatos([]);

    const rolesCon = async (permiso: string) =>
      (
        await comoPropietario<{ nombre: string }>(
          `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
           where rp.permiso = $1 and r.cuenta_id = $2 order by r.nombre`,
          [permiso, cuenta.cuentaId],
        )
      ).map((fila) => fila.nombre);
    expect(await rolesCon('bancos.saldos-iniciales.ver')).toEqual(['Rol de lector']);
    expect(await rolesCon('bancos.saldos-iniciales.anular')).toEqual(['Rol de editor']);
    const deUsuario = await comoPropietario<{ permiso: string }>(
      `select permiso from core.usuario_permisos where usuario_id = $1 and permiso like 'bancos.saldos-iniciales.%' order by permiso`,
      [dueno!.id],
    );
    expect(deUsuario.map((fila) => fila.permiso)).toEqual([
      'bancos.saldos-iniciales.anular',
      'bancos.saldos-iniciales.ver',
    ]);
  });
});
