import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { armarEscenarioDeFlujo, type EscenarioDeFlujo } from './soporte/escenario-de-flujo.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA_POR_CONCEPTO = '/api/bancos/movimientos-por-concepto';
const entorno = usarEntornoApi();
let escenario: EscenarioDeFlujo;
let cuenta: EscenarioDeFlujo['cuenta'];
let concepto: EscenarioDeFlujo['concepto'];
let cuentaB = '';

beforeAll(async () => {
  escenario = await armarEscenarioDeFlujo(entorno, 'Porconcepto');
  ({ cuenta, concepto, cuentaB } = escenario);
});

interface FilaPorConcepto {
  conceptoNombre: string;
  esDeSistema: boolean;
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
  cantidadDeInversos: number;
}

const porConcepto = async (consulta: string) => {
  const respuesta = await cuenta.propietario.get(`${RUTA_POR_CONCEPTO}?${consulta}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo as {
    conceptos: FilaPorConcepto[];
    entradas: string;
    salidas: string;
    neto: string;
    cantidad: number;
  };
};

describe('movimientos por concepto por API', () => {
  it('totaliza por concepto en febrero: el inverso resta en el concepto de su original y se cuenta aparte', async () => {
    const reporte = await porConcepto('desde=2026-02-01&hasta=2026-02-28');

    const ventas = reporte.conceptos.find((c) => c.conceptoNombre === 'Ventas');
    expect(ventas).toMatchObject({
      entradas: '500.00',
      salidas: '0.00',
      neto: '500.00',
      cantidad: 2,
      cantidadDeInversos: 1,
    });
    expect(reporte.conceptos.find((c) => c.conceptoNombre === 'Proveedores')).toMatchObject({
      salidas: '200.00',
      cantidad: 1,
    });
    const transferencia = reporte.conceptos.find((c) => c.esDeSistema && c.conceptoNombre.startsWith('Transferencia'));
    expect(transferencia).toMatchObject({ entradas: '100.00', salidas: '100.00', neto: '0.00' });
    expect(reporte.neto).toBe('527.00');
  });

  it('filtra por cuenta y por conceptos elegidos', async () => {
    const soloVentas = await porConcepto(`desde=2026-02-01&hasta=2026-02-28&conceptoIds=${concepto.ventas}`);
    const dos = await porConcepto(
      `desde=2026-02-01&hasta=2026-02-28&cuentaBancariaId=${cuentaB}&conceptoIds=${concepto.ventas},${concepto.prestamo}`,
    );

    expect(soloVentas.conceptos.map((c) => c.conceptoNombre)).toEqual(['Ventas']);
    expect(dos.conceptos.map((c) => [c.conceptoNombre, c.neto])).toEqual([['Préstamo', '300.00']]);
  });

  it('marzo trae solo el inverso del cheque, en el concepto del original, con cantidad cero', async () => {
    const reporte = await porConcepto('desde=2026-03-01&hasta=2026-03-31');

    expect(reporte.conceptos).toEqual([
      expect.objectContaining({
        conceptoNombre: 'Proveedores',
        entradas: '0.00',
        salidas: '-80.00',
        cantidad: 0,
        cantidadDeInversos: 1,
      }),
    ]);
  });

  it('valida los conceptos y el rango, exporta con los permisos de movimientos', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Ve por concepto',
      permisos: ['bancos.movimientos.ver'],
    });
    const consulta = 'desde=2026-02-01&hasta=2026-02-28';

    expect((await cuenta.propietario.get(`${RUTA_POR_CONCEPTO}?${consulta}&conceptoIds=no-es-uuid`)).estado).toBe(400);
    expect((await cuenta.propietario.get(`${RUTA_POR_CONCEPTO}?desde=2026-03-01&hasta=2026-02-01`)).estado).toBe(400);
    expect((await cuenta.propietario.get(`${RUTA_POR_CONCEPTO}/exportar?${consulta}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_POR_CONCEPTO}?${consulta}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_POR_CONCEPTO}/exportar?${consulta}`)).estado).toBe(403);
  });
});
