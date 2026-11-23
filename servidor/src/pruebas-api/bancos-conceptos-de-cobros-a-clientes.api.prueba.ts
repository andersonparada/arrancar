import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0039_cobros_a_clientes.sql', import.meta.url);
const CLAVES = ['cheque_rechazado', 'cobro_a_cliente', 'cobro_a_cliente_de_activo', 'devolucion_a_cliente'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

const correrMigracion = () =>
  comoPropietario(readFileSync(MIGRACION, 'utf8').replaceAll('--> statement-breakpoint', ''), []);

const conceptos = () =>
  comoPropietario<Record<string, string | boolean | null>>(
    `select clave_de_sistema, nombre, aplica_a, actividad_de_flujo, grupo_de_flujo, es_cargo_bancario, activo
     from bancos.conceptos where empresa_id = $1 and clave_de_sistema = any($2) order by clave_de_sistema`,
    [cuenta.empresaId, CLAVES],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Conceptos de cobros',
    usuario: 'propietariocobros',
    modulos: ['bancos'],
  });
  await cuenta.propietario.get('/api/bancos/conceptos');
});

describe('migración 0039: conceptos de sistema de Cuentas por cobrar', () => {
  it('la semilla ya trae los cuatro conceptos de sistema', async () => {
    const filas = await conceptos();

    expect(filas.map((f) => [f.clave_de_sistema, f.aplica_a, f.actividad_de_flujo, f.grupo_de_flujo])).toEqual([
      ['cheque_rechazado', 'debito', 'operacion', 'Cobros a clientes'],
      ['cobro_a_cliente', 'credito', 'operacion', 'Cobros a clientes'],
      ['cobro_a_cliente_de_activo', 'credito', 'inversion', 'Venta de activos'],
      ['devolucion_a_cliente', 'debito', 'operacion', 'Cobros a clientes'],
    ]);
  });

  it('pone la clave al concepto del mismo nombre normalizado, inserta lo que falta y repetirla no duplica', async () => {
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null, nombre = 'COBROS  a clientes', aplica_a = 'ambos',
       activo = false where empresa_id = $1 and clave_de_sistema = 'cobro_a_cliente'`,
      [cuenta.empresaId],
    );
    await comoPropietario(`delete from bancos.conceptos where empresa_id = $1 and clave_de_sistema = $2`, [
      cuenta.empresaId,
      'devolucion_a_cliente',
    ]);

    await correrMigracion();
    await correrMigracion();

    const filas = await conceptos();
    expect(filas.map((f) => f.clave_de_sistema)).toEqual(CLAVES);
    expect(filas.find((f) => f.clave_de_sistema === 'cobro_a_cliente')).toMatchObject({
      nombre: 'COBROS  a clientes',
      aplica_a: 'credito',
      activo: true,
    });
  });

  it('el «Cheque rechazado» sugerido de una empresa con catálogo recibe la clave y sigue siendo cargo bancario', async () => {
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null where empresa_id = $1 and clave_de_sistema = 'cheque_rechazado'`,
      [cuenta.empresaId],
    );

    await correrMigracion();

    const rechazado = (await conceptos()).find((f) => f.clave_de_sistema === 'cheque_rechazado');
    expect(rechazado).toMatchObject({ nombre: 'Cheque rechazado', es_cargo_bancario: true });
  });

  it('un concepto «Cobros a clientes» con movimientos no se adopta: se renombra y el de sistema se inserta aparte', async () => {
    const cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de cobros viejos');
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null, aplica_a = 'ambos' where empresa_id = $1 and clave_de_sistema = 'cobro_a_cliente'`,
      [cuenta.empresaId],
    );
    await comoPropietario(
      `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id)
       select $1, $2, 'debito', '2026-02-01', 5, id from bancos.conceptos
       where empresa_id = $1 and clave_de_sistema is null and nombre = 'Cobros a clientes'`,
      [cuenta.empresaId, cuentaBancariaId],
    );

    await correrMigracion();
    await correrMigracion();

    const filas = await comoPropietario<Record<string, string | null>>(
      `select c.clave_de_sistema, c.nombre, c.aplica_a, (select count(*) from bancos.movimientos m where m.concepto_id = c.id)::text as usos
       from bancos.conceptos c where c.empresa_id = $1 and core.nombre_normalizado(c.nombre) like 'cobros a clientes%'
       order by c.nombre`,
      [cuenta.empresaId],
    );
    expect(filas).toEqual([
      { clave_de_sistema: 'cobro_a_cliente', nombre: 'Cobros a clientes', aplica_a: 'credito', usos: '0' },
      { clave_de_sistema: null, nombre: 'Cobros a clientes (anterior)', aplica_a: 'ambos', usos: '1' },
    ]);
  });

  it('una empresa sin catálogo no recibe nada: lo siembra completo al abrir Conceptos', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Sin catálogo de cobros',
      usuario: 'propietariosincobros',
      modulos: ['bancos'],
    });

    await correrMigracion();

    const filas = await comoPropietario(`select 1 from bancos.conceptos where empresa_id = $1`, [otra.empresaId]);
    expect(filas).toHaveLength(0);
  });
});
