import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { armarEscenarioDeFlujo, type EscenarioDeFlujo } from './soporte/escenario-de-flujo.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA_FLUJO = '/api/bancos/flujo-de-efectivo';
const entorno = usarEntornoApi();
let escenario: EscenarioDeFlujo;
let cuentaA = '';
let cuentaB = '';
let cuenta: EscenarioDeFlujo['cuenta'];

interface Linea {
  etiqueta: string;
  entradas: string;
  salidas: string;
  neto: string;
}
interface Flujo {
  actividades: Array<{ actividad: string; lineas: Linea[]; neto: string }>;
  lineasAparte: Array<Linea & { clave: string; cantidad: number }>;
  control: Record<string, string | boolean>;
}

beforeAll(async () => {
  escenario = await armarEscenarioDeFlujo(entorno, 'Flujo');
  ({ cuenta, cuentaA, cuentaB } = escenario);
});

const flujo = async (consulta: string, usuario: ClienteApi = cuenta.propietario): Promise<Flujo> => {
  const respuesta = await usuario.get(`${RUTA_FLUJO}?${consulta}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo as Flujo;
};

const lineasDe = (reporte: Flujo, actividad: string) =>
  reporte.actividades
    .find((a) => a.actividad === actividad)!
    .lineas.map((l) => [l.etiqueta, l.entradas, l.salidas, l.neto]);

describe('flujo de efectivo por API', () => {
  it('febrero de toda la empresa: por actividad y grupo, el inverso resta en su original, sin transferencias y cuadrado', async () => {
    const reporte = await flujo('desde=2026-02-01&hasta=2026-02-28');

    expect(lineasDe(reporte, 'operacion')).toEqual([
      ['Cobros a clientes', '500.00', '0.00', '500.00'],
      ['Pagos a proveedores', '0.00', '200.00', '-200.00'],
    ]);
    expect(lineasDe(reporte, 'inversion')).toEqual([['Compra de terreno', '0.00', '50.00', '-50.00']]);
    expect(lineasDe(reporte, 'financiamiento')).toEqual([['Préstamo', '300.00', '0.00', '300.00']]);
    expect(reporte.lineasAparte.map((l) => [l.clave, l.neto])).toEqual([
      ['sin_actividad', '-30.00'],
      ['sin_clasificar', '7.00'],
    ]);
    expect(reporte.control).toEqual({
      saldoAlInicio: '1920.00',
      saldosInicialesDelRango: '0.00',
      flujoNeto: '527.00',
      saldoCalculado: '2447.00',
      saldoAlFinal: '2447.00',
      diferencia: '0.00',
      cuadra: true,
    });
  });

  it('con una sola cuenta las transferencias salen en su línea y también cuadra', async () => {
    const reporte = await flujo(`desde=2026-02-01&hasta=2026-02-28&cuentaBancariaId=${cuentaA}`);

    expect(reporte.lineasAparte.map((l) => [l.clave, l.etiqueta, l.salidas, l.neto])).toEqual([
      ['transferencias', 'Transferencias entre cuentas propias', '100.00', '-100.00'],
      ['sin_actividad', 'Otros movimientos sin actividad', '30.00', '-30.00'],
      ['sin_clasificar', 'Sin clasificar (pendiente)', '0.00', '7.00'],
    ]);
    expect(reporte.control).toMatchObject({ saldoAlInicio: '920.00', saldoAlFinal: '1047.00', cuadra: true });
    expect(lineasDe(reporte, 'financiamiento')).toEqual([]);
  });

  it('el cheque anulado con inverso en otro mes: enero lo trae en salidas y marzo lo resta, y ambos cuadran', async () => {
    const enero = await flujo(`desde=2026-01-01&hasta=2026-01-31&cuentaBancariaId=${cuentaA}`);
    const marzo = await flujo(`desde=2026-03-01&hasta=2026-03-31&cuentaBancariaId=${cuentaA}`);

    expect(lineasDe(enero, 'operacion')).toEqual([['Pagos a proveedores', '0.00', '80.00', '-80.00']]);
    expect(enero.control).toMatchObject({ saldosInicialesDelRango: '1000.00', saldoAlFinal: '920.00', cuadra: true });
    expect(lineasDe(marzo, 'operacion')).toEqual([['Pagos a proveedores', '0.00', '-80.00', '80.00']]);
    expect(marzo.control).toMatchObject({ saldoAlInicio: '1047.00', saldoAlFinal: '1127.00', cuadra: true });
  });

  it('todo el año: el proveedor queda en lo pagado de verdad, la apertura fuera del flujo y el saldo igual al de las cuentas', async () => {
    const reporte = await flujo('desde=2026-01-01&hasta=2026-12-31');
    const saldos = (await saldoDe(cuenta.propietario, cuentaA)) + '|' + (await saldoDe(cuenta.propietario, cuentaB));

    expect(lineasDe(reporte, 'operacion')[1]).toEqual(['Pagos a proveedores', '0.00', '200.00', '-200.00']);
    expect(reporte.control).toMatchObject({ saldoAlInicio: '0.00', saldosInicialesDelRango: '2000.00', cuadra: true });
    expect(saldos).toBe('1127.00|1400.00');
    expect(reporte.control.saldoAlFinal).toBe('2527.00');
  });

  it('un rango sin movimientos deja todo en cero y cuadra', async () => {
    const reporte = await flujo('desde=2025-01-01&hasta=2025-01-31');

    expect(reporte.control).toMatchObject({ saldoAlInicio: '0.00', saldoAlFinal: '0.00', cuadra: true });
    expect(reporte.lineasAparte.map((l) => l.clave)).toEqual(['sin_clasificar']);
  });

  it('valida el rango y la cuenta, y no ve las cuentas de otra empresa', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra flujo',
      usuario: 'propietariootraflujo',
      modulos: ['bancos'],
    });

    expect((await cuenta.propietario.get(`${RUTA_FLUJO}?hasta=2026-02-28`)).estado).toBe(400);
    expect((await cuenta.propietario.get(`${RUTA_FLUJO}?desde=2026-03-01&hasta=2026-02-28`)).estado).toBe(400);
    expect(
      (await otra.propietario.get(`${RUTA_FLUJO}?desde=2026-02-01&hasta=2026-02-28&cuentaBancariaId=${cuentaA}`))
        .estado,
    ).toBe(404);
    expect(
      (await otra.propietario.get(`${RUTA_FLUJO}?desde=2026-02-01&hasta=2026-02-28`)).cuerpo.control,
    ).toMatchObject({
      saldoAlFinal: '0.00',
      cuadra: true,
    });
  });

  it('exporta a Excel y respeta los permisos propios del flujo', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Ve flujo',
      permisos: ['bancos.flujo-de-efectivo.ver'],
    });
    const deMovimientos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'De',
      apellidos: 'Movimientos flujo',
      permisos: ['bancos.movimientos.ver', 'bancos.movimientos.exportar'],
    });
    const consulta = 'desde=2026-02-01&hasta=2026-02-28';

    expect((await cuenta.propietario.get(`${RUTA_FLUJO}/exportar?${consulta}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_FLUJO}?${consulta}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_FLUJO}/exportar?${consulta}`)).estado).toBe(403);
    expect((await deMovimientos.get(`${RUTA_FLUJO}?${consulta}`)).estado).toBe(403);
  });
});
