/** BS-R1: «Saldos por cuenta», sus totales de Bancos y Sobregiros sin compensar, su Excel y sus permisos. */
import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio, filasDeExcel, guardarSaldo } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/saldos-por-cuenta';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaA = '';
const usuario = () => cuenta.propietario;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Saldos excel', usuario: 'propietariosaldosexcel' });
  cuentaA = await crearCuentaSinSaldo(usuario());
  await guardarSaldo(usuario(), cuentaA, '9330.00');
});

describe('saldos por cuenta: Bancos y Sobregiros sin compensar', () => {
  it('una cuenta negativa va a Sobregiros en valor absoluto y no resta del total de Bancos', async () => {
    const aparte = await empresaConInicio(entorno, { nombre: 'Totales saldos', usuario: 'propietariototalessaldos' });
    for (const saldo of ['1000.00', '500.50', '-300.00']) {
      await guardarSaldo(aparte.propietario, await crearCuentaSinSaldo(aparte.propietario), saldo);
    }

    const { cuerpo } = await aparte.propietario.get(`${RUTA}?fecha=2025-12-31`);

    expect(cuerpo.bancos).toMatchObject({ cantidadDeCuentas: 2, saldoEnLibros: '1500.50', disponible: '1500.50' });
    expect(cuerpo.sobregiros).toMatchObject({ cantidadDeCuentas: 1, saldoEnLibros: '300.00', disponible: '300.00' });
    expect(Object.keys(cuerpo)).not.toContain('neto');
    expect(cuerpo.nota).toContain('fondos retenidos');
    expect(cuerpo.nota).toContain('sobregiro autorizado');
  });
});

describe('saldos por cuenta: Excel y permisos', () => {
  it('exporta cada cuenta con sus totales sin compensar y la nota', async () => {
    const respuesta = await usuario().get(`${RUTA}/exportar?fecha=2025-12-31&cuentaBancariaId=${cuentaA}`);
    expect(respuesta.estado).toBe(200);

    const filas = await filasDeExcel(respuesta.cuerpo as Buffer);

    expect(filas[0]).toContain('Saldo en libros');
    expect(filas[0]).toContain('Disponible');
    expect(filas[1]?.[3]).toBe(9330);
    expect(filas.some((fila) => fila[0] === 'Total Bancos')).toBe(true);
    expect(filas.some((fila) => fila[0] === 'Total Sobregiros bancarios')).toBe(true);
    expect(JSON.stringify(filas.at(-1))).toContain('fondos retenidos');
  });

  it('sin el permiso de ver o de exportar responde 403; con solo el de movimientos del reporte tampoco', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Ver saldos',
      permisos: ['bancos.saldos-por-cuenta.ver'],
    });
    const deMovimientos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'De',
      apellidos: 'Movimientos',
      permisos: ['bancos.movimientos.ver', 'bancos.movimientos.exportar'],
    });

    expect((await soloVer.get(`${RUTA}?fecha=2025-12-31`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA}/exportar?fecha=2025-12-31`)).estado).toBe(403);
    expect((await deMovimientos.get(`${RUTA}?fecha=2025-12-31`)).estado).toBe(403);
    expect((await deMovimientos.get(`${RUTA}/exportar?fecha=2025-12-31`)).estado).toBe(403);
  });

  it('un usuario de otra empresa no ve las cuentas de esta', async () => {
    const otra = await empresaConInicio(entorno, { nombre: 'Otra saldos', usuario: 'propietariootrasaldos' });

    const respuesta = await otra.propietario.get(`${RUTA}?fecha=2025-12-31&cuentaBancariaId=${cuentaA}`);
    const lista = await otra.propietario.get(`${RUTA}?fecha=2025-12-31`);

    expect(respuesta.estado).toBe(404);
    expect(lista.cuerpo.cuentas).toEqual([]);
  });
});
