/**
 * Los reportes de Cuentas por liquidar (CL-6): CL-R1, anticipos por liquidar al corte (por beneficiario, con antigüedad,
 * vencidos y el corte hacia atrás) y CL-R2, lo no liquidado por destino; su Excel, el aislamiento por empresa y los
 * permisos de ver y de exportar de cada ruta.
 */

import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { ponerFechasAlAnticipo, RUTA_DE_ANTICIPOS } from './soporte/cuentas-por-liquidar-anticipos.js';
import { EscenarioDeGastos } from './soporte/cuentas-por-liquidar-gastos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-liquidar/reportes';
const entorno = usarEntornoApi();
let e: EscenarioDeGastos;
let ana: string;
let beto: string;
let vencido: { id: string; numero: string };
let alDia: { id: string; numero: string };

const letras = () =>
  Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

const entregar = async (beneficiario: string, monto: string, cambios: Record<string, unknown> = {}) =>
  e.anticipos.entregar(e.anticipos.conCheque(beneficiario, monto, cambios));

const liquidar = async (anticipoId: string, cuerpo: Record<string, unknown>) => {
  const respuesta = await e
    .propietario()
    .post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/liquidar`, { devuelto: '0.00', noLiquidado: '0.00', ...cuerpo });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
};

const ver = async (ruta: string) => {
  const respuesta = await e.propietario().get(`${RUTA}/${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

/**
 * Cuatro anticipos abiertos o liquidados: el de Ana (Q1,000, hace 100 días, venció hace 70, con Q300 gastados), el de
 * Beto (Q500, de hace 5 días, vence en 10) y, liquidados hoy, uno con Q600 por cobrar en 6 cuotas, otro con Q100 de renta
 * del trabajo y otro con Q50 de pérdida (de un beneficiario que no es empleado).
 */
beforeAll(async () => {
  e = await EscenarioDeGastos.preparar(entorno, 'cxlreportes');
  ana = await e.anticipos.tercero('Ana', letras());
  beto = await e.anticipos.tercero('Beto', letras());
  vencido = await entregar(ana, '1000.00');
  await ponerFechasAlAnticipo(vencido.id, haceDias(100), haceDias(70));
  await e.anticipos.sembrarGasto(vencido.id, '300.00', { fecha: haceDias(90) });
  alDia = await entregar(beto, '500.00');
  await ponerFechasAlAnticipo(alDia.id, haceDias(5), haceDias(-10));

  const aCobrar = await entregar(await e.anticipos.tercero('Carla', letras()), '1000.00');
  await e.anticipos.sembrarGasto(aCobrar.id, '300.00');
  await liquidar(aCobrar.id, {
    devuelto: '100.00',
    noLiquidado: '600.00',
    destinoDeNoLiquidado: 'cobrar',
    cuotas: 6,
    motivoDeNoLiquidado: 'No entregó facturas',
  });
  const aRenta = await entregar(await e.anticipos.tercero('Dora', letras()), '100.00');
  await liquidar(aRenta.id, {
    noLiquidado: '100.00',
    destinoDeNoLiquidado: 'renta_del_trabajo',
    motivoDeNoLiquidado: 'Gasto personal',
  });
  const aPerdida = await entregar(await e.anticipos.tercero('Eva', letras()), '50.00', { esEmpleado: false });
  await liquidar(aPerdida.id, {
    noLiquidado: '50.00',
    destinoDeNoLiquidado: 'perdida',
    motivoDeNoLiquidado: 'Se perdió',
  });
});

describe('CL-R1: anticipos por liquidar al corte', () => {
  it('por omisión trae los abiertos por beneficiario, con lo por justificar, la antigüedad y los tramos', async () => {
    const reporte = await ver('anticipos-por-liquidar');

    expect(reporte.corte).toBe(HOY);
    expect(reporte.beneficiarios.map((b: { beneficiario: string }) => b.beneficiario)).toEqual([
      expect.stringMatching(/^Ana /),
      expect.stringMatching(/^Beto /),
    ]);
    expect(reporte.beneficiarios[0]).toMatchObject({
      cantidad: 1,
      vencidos: 1,
      monto: '1000.00',
      porJustificar: '700.00',
    });
    expect(reporte.beneficiarios[0].anticipos[0]).toMatchObject({
      numero: vencido.numero,
      diasVencido: 70,
      diasDesdeLaEntrega: 100,
      tramo: 'de_61_a_90',
    });
    expect(reporte.beneficiarios[1].anticipos[0]).toMatchObject({
      numero: alDia.numero,
      vencido: false,
      porJustificar: '500.00',
      tramo: 'al_dia',
    });
    expect(reporte.total).toEqual({
      beneficiarios: 2,
      anticipos: 2,
      vencidos: 1,
      monto: '1500.00',
      porJustificar: '1200.00',
      aReembolsar: '0.00',
      porJustificarVencido: '700.00',
    });
    expect(reporte.porTramo.map((t: { cantidad: number }) => t.cantidad)).toEqual([1, 0, 0, 1, 0]);
  });

  it('con corte anterior a la liquidación y al gasto, trae lo que estaba abierto entonces', async () => {
    const reporte = await ver(`anticipos-por-liquidar?corte=${haceDias(95)}`);

    expect(reporte.total).toMatchObject({ anticipos: 1, vencidos: 0, porJustificar: '1000.00' });
    expect(reporte.beneficiarios[0].anticipos[0]).toMatchObject({ numero: vencido.numero, diasVencido: 0 });
  });

  it('filtra por beneficiario y por vencidos', async () => {
    const deBeto = await ver(`anticipos-por-liquidar?beneficiarioId=${beto}`);
    const soloVencidos = await ver('anticipos-por-liquidar?soloVencidos=true');

    expect(deBeto.total.anticipos).toBe(1);
    expect(soloVencidos.beneficiarios).toHaveLength(1);
    expect(soloVencidos.beneficiarios[0].anticipos[0].numero).toBe(vencido.numero);
  });

  it('rechaza un corte mal escrito', async () => {
    expect((await e.propietario().get(`${RUTA}/anticipos-por-liquidar?corte=ayer`)).estado).toBe(400);
  });
});

describe('CL-R2: lo no liquidado', () => {
  it('agrupa por destino, con la cuota al cobrar y el total', async () => {
    const reporte = await ver(`no-liquidado?desde=${haceDias(1)}&hasta=${HOY}`);

    expect(
      reporte.grupos.map((g: { destino: string; cantidad: number; monto: string }) => [g.destino, g.cantidad, g.monto]),
    ).toEqual([
      ['cobrar', 1, '600.00'],
      ['renta_del_trabajo', 1, '100.00'],
      ['perdida', 1, '50.00'],
    ]);
    expect(reporte.grupos[0].filas[0]).toMatchObject({
      noLiquidado: '600.00',
      cuotas: 6,
      valorDeCuota: '100.00',
      esEmpleado: true,
      fechaDeLiquidacion: HOY,
      motivo: 'No entregó facturas',
    });
    expect(reporte.grupos[1].filas[0]).toMatchObject({ cuotas: null, valorDeCuota: null });
    expect(reporte.grupos[2].filas[0].esEmpleado).toBe(false);
    expect(reporte.total).toEqual({ cantidad: 3, monto: '750.00' });
  });

  it('por omisión toma el mes de hoy, filtra por destino y no mezcla los abiertos', async () => {
    const deHoy = await ver('no-liquidado');
    const soloPerdida = await ver(`no-liquidado?destino=perdida&hasta=${HOY}`);
    const otroMes = await ver('no-liquidado?desde=2020-01-01&hasta=2020-01-31');

    expect(deHoy.hasta).toBe(HOY);
    expect(deHoy.desde).toBe(`${HOY.slice(0, 7)}-01`);
    expect(soloPerdida.grupos.map((g: { destino: string }) => g.destino)).toEqual(['perdida']);
    expect(otroMes.total).toEqual({ cantidad: 0, monto: '0.00' });
  });

  it('rechaza un período invertido o una fecha mal escrita', async () => {
    const invertido = await e.propietario().get(`${RUTA}/no-liquidado?desde=${HOY}&hasta=${haceDias(3)}`);
    expect(invertido.estado).toBe(400);
    expect(invertido.cuerpo.error.codigo).toBe('periodo_invertido');
    expect((await e.propietario().get(`${RUTA}/no-liquidado?desde=ayer`)).estado).toBe(400);
  });

  it('otra empresa no ve nada', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra de reportes',
      usuario: 'cxlreportesotra',
      modulos: ['terceros', 'libro-de-compras', 'bancos', 'cuentas-por-liquidar'],
    });
    const reporte = (await otra.propietario.get(`${RUTA}/no-liquidado?desde=${haceDias(1)}&hasta=${HOY}`)).cuerpo;
    const porLiquidar = (await otra.propietario.get(`${RUTA}/anticipos-por-liquidar`)).cuerpo;

    expect(reporte.total.cantidad).toBe(0);
    expect(porLiquidar.total.anticipos).toBe(0);
  });
});

describe('Excel y permisos', () => {
  const RUTAS = ['anticipos-por-liquidar', 'no-liquidado'];

  async function filasDe(ruta: string): Promise<string[]> {
    const exportado = await e.propietario().get(`${RUTA}/${ruta}`);
    expect(exportado.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    return Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );
  }

  it('CL-R1 exporta los anticipos, los tramos, el total y el corte', async () => {
    const filas = await filasDe(`anticipos-por-liquidar/exportar?corte=${HOY}`);

    expect(filas.some((f) => f.startsWith('Anticipos|Ana ') && f.includes(`|${vencido.numero}|`))).toBe(true);
    expect(filas.filter((f) => f.startsWith('Por antigüedad|'))).toHaveLength(5);
    expect(filas.some((f) => f.startsWith('Total|') && f.endsWith('|1500|1200|0'))).toBe(true);
    expect(filas.some((f) => f.startsWith('Nota|') && f.includes('por liquidar al'))).toBe(true);
  });

  it('CL-R2 exporta lo no liquidado por destino, los subtotales y el total', async () => {
    const filas = await filasDe(`no-liquidado/exportar?desde=${haceDias(1)}&hasta=${HOY}`);

    expect(filas.some((f) => f.startsWith('No liquidado|Por cobrar') && f.includes('|600|6|100|'))).toBe(true);
    expect(filas.filter((f) => f.startsWith('Subtotal|'))).toHaveLength(3);
    expect(filas.some((f) => f.startsWith('Total|3 anticipos') && f.endsWith('|750'))).toBe(true);
  });

  it('pide el permiso de ver o de exportar de cada ruta', async () => {
    const permiso = (nombre: string, permisos: string[]) =>
      crearUsuarioConPermisos(entorno, e.anticipos.cuenta, { nombres: nombre, apellidos: 'Reportes', permisos });
    const soloVer = await permiso('Lector de reportes', ['cuentas-por-liquidar.reportes.ver']);
    const soloExportar = await permiso('Exportador de reportes', ['cuentas-por-liquidar.reportes.exportar']);
    const deAnticipos = await permiso('Lector de anticipos', ['cuentas-por-liquidar.anticipos.ver']);

    for (const ruta of RUTAS) {
      expect((await entorno.nuevoCliente().get(`${RUTA}/${ruta}`)).estado).toBe(401);
      expect((await deAnticipos.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloExportar.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}`)).estado).toBe(200);
      expect((await soloExportar.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(200);
    }
  });
});
