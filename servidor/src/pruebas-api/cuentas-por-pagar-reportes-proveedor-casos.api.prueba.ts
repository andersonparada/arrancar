/**
 * Casos de los reportes de proveedor (CP5-3) con una empresa sin fecha de inicio y fechas fijas: el saldo inicial con
 * «anteriores a la fecha de inicio» en el estado de cuenta (R3), el último movimiento y la posible prescripción de los saldos
 * a favor (R4) y las contraseñas vencidas y por vencer (R5), con sus permisos y su Excel.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { sumarDias } from '../modulos/cuentas-por-pagar/dominio/fechas-de-corte.js';
import { sembrarAjuste } from './soporte/cuentas-por-pagar-notas.js';
import { sembrarPago } from './soporte/cuentas-por-pagar-pagos.js';
import {
  fecharAjuste,
  sembrarContrasenaEnLaBase,
  sembrarDocumento,
  autorizarEnLaBase,
} from './soporte/cuentas-por-pagar-reportes.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  HOY,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxprepprov', MODULOS_DE_CUENTAS_POR_PAGAR);
});

const propietario = () => escenario.cuenta.propietario;
const proveedor = async (nombre: string, cuerpo: string) =>
  (await registrarProveedor(escenario.cuenta, nombre, { nit: nitValido(cuerpo) })).proveedorId;
const ver = async (ruta: string) => {
  const respuesta = await propietario().get(`${RUTA}/${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

describe('R3: un saldo inicial con pagos y notas anteriores a la fecha de inicio', () => {
  it('sale por lo que se debía al iniciar, con la diferencia en su columna, y el saldo cuadra con R1', async () => {
    const proveedorId = await proveedor('Inicial S.A.', '6200001');
    await sembrarDocumento(escenario, {
      proveedorId,
      numero: 'SI-1',
      emision: '2026-01-10',
      vencimiento: '2026-02-10',
      monto: '500',
      total: '600',
    });

    const estado = await ver(`estado-de-cuenta?proveedorId=${proveedorId}&desde=2026-01-01&hasta=2026-01-31`);
    const paraElProveedor = await ver(
      `estado-de-cuenta?proveedorId=${proveedorId}&desde=2026-01-01&hasta=2026-01-31&presentacion=para_el_proveedor`,
    );
    const r1 = await ver(`saldos-por-proveedor?corte=2026-01-31&proveedorId=${proveedorId}`);

    expect(estado.lineas).toMatchObject([
      { total: '600.00', retenciones: '0.00', anterioresAlInicio: '100.00', cargo: '500.00', saldo: '500.00' },
    ]);
    expect(estado.totales).toEqual({ saldoAnterior: '0.00', cargos: '500.00', abonos: '0.00', saldoFinal: '500.00' });
    expect(paraElProveedor.lineas).toMatchObject([{ cargo: '500.00', total: null }]);
    expect(r1.acreedores[0].saldoNeto).toBe(estado.totales.saldoFinal);
  });
});

describe('R4: saldos a favor, último movimiento y posible prescripción', () => {
  let proveedorId: string;
  const nota = (numero: string, emision: string, monto: string) =>
    sembrarDocumento(escenario, {
      proveedorId,
      numero,
      emision,
      vencimiento: null,
      monto,
      tipo: 'nota_de_credito',
    });
  const consulta = (corte: string, extra = '') =>
    ver(`saldos-a-favor?corte=${corte}&proveedorId=${proveedorId}${extra}`);

  beforeAll(async () => {
    proveedorId = await proveedor('Favor S.A.', '6200002');
    await nota('A', '2019-03-01', '300');
    const b = await nota('B', '2019-03-01', '400');
    await fecharAjuste(await sembrarAjuste(escenario, b, { monto: '50.00' }), '2025-06-01');
    await nota('C', '2026-02-01', '100');
    const d = await nota('D', '2026-02-01', '100');
    await fecharAjuste(await sembrarAjuste(escenario, d, { monto: '100.00' }), '2026-03-01');
  });

  it('cuenta los años desde el último movimiento (la emisión o un ajuste vigente) y marca lo posiblemente prescrito', async () => {
    const reporte = await consulta('2026-06-30');

    expect(reporte.filas).toMatchObject([
      {
        numero: 'A',
        saldoLibre: '300.00',
        ultimoMovimiento: '2019-03-01',
        aniosDesdeElUltimoMovimiento: 7,
        tramo: 'de_5_o_mas',
        posiblePrescripcionDesde: '2024-03-01',
        posiblementePrescrito: true,
      },
      {
        numero: 'B',
        saldoLibre: '350.00',
        ajustado: '50.00',
        ultimoMovimiento: '2025-06-01',
        aniosDesdeElUltimoMovimiento: 1,
        tramo: 'de_1_a_2',
        posiblePrescripcionDesde: '2030-06-01',
        posiblementePrescrito: false,
      },
      { numero: 'C', saldoLibre: '100.00', ultimoMovimiento: '2026-02-01', tramo: 'menos_de_1' },
    ]);
    expect(reporte.total).toBe('750.00');
    expect(reporte.totalesPorTramo).toMatchObject({ de_5_o_mas: '300.00', de_1_a_2: '350.00', menos_de_1: '100.00' });
    expect(reporte.posiblementePrescrito).toEqual({ cantidad: 1, total: '300.00' });
    expect(reporte.leyendas.join(' ')).toContain('La prescripción no opera sola');
  });

  it('a un corte anterior al ajuste, este no mueve el último movimiento y las notas posteriores no salen', async () => {
    const reporte = await consulta('2025-05-01');

    expect(reporte.filas).toMatchObject([
      { numero: 'A', tramo: 'de_5_o_mas' },
      { numero: 'B', saldoLibre: '400.00', ultimoMovimiento: '2019-03-01', tramo: 'de_5_o_mas' },
    ]);
  });

  it('las notas sin saldo solo salen con `incluirSinSaldo`', async () => {
    const reporte = await consulta('2026-06-30', '&incluirSinSaldo=true');

    expect(reporte.filas.map(({ numero }: { numero: string }) => numero)).toEqual(['A', 'B', 'C', 'D']);
    expect(reporte.filas[3]).toMatchObject({ saldoLibre: '0.00', ajustado: '100.00' });
  });

  it('el total de saldos a favor es el de R1 al mismo corte', async () => {
    const r1 = await ver(`saldos-por-proveedor?corte=2026-06-30&proveedorId=${proveedorId}&incluirSinSaldo=true`);

    expect(r1.deudores[0].saldoNeto).toBe((await consulta('2026-06-30')).total);
  });
});

describe('R5: contraseñas por pagar y con pago prometido vencido', () => {
  let proveedorId: string;
  const ayer = sumarDias(HOY, -1);

  beforeAll(async () => {
    proveedorId = await proveedor('Contraseñas S.A.', '6200003');
    const cargo = (numero: string, monto: string, autorizado: boolean) =>
      sembrarDocumento(escenario, {
        proveedorId,
        numero,
        emision: '2026-01-10',
        vencimiento: `2026-02-${numero.slice(1)}`,
        monto,
        autorizado,
      });
    const [c1, c2, c3, c4] = [
      await cargo('C10', '100', true),
      await cargo('C20', '200', false),
      await cargo('C15', '300', true),
      await cargo('C28', '100', true),
    ];
    const [k1, k2, k3] = [
      await sembrarContrasenaEnLaBase(escenario, proveedorId, [c1!, c2!]),
      await sembrarContrasenaEnLaBase(escenario, proveedorId, [c3!]),
      await sembrarContrasenaEnLaBase(escenario, proveedorId, [c4!]),
    ];
    await consultar('update cuentas_por_pagar.contrasenas set fecha_de_pago = $2 where id = $1', [
      k1,
      sumarDias(HOY, -3),
    ]);
    await consultar('update cuentas_por_pagar.contrasenas set fecha_de_pago = $2 where id = $1', [
      k2,
      sumarDias(HOY, 5),
    ]);
    await consultar('update cuentas_por_pagar.contrasenas set fecha_de_pago = $2 where id = $1', [
      k3,
      sumarDias(HOY, -9),
    ]);
    await sembrarPago(escenario, { contrasenaId: k1, lineas: [{ cargoPropio: c1!, monto: '40.00' }] });
    await sembrarPago(escenario, { contrasenaId: k3, lineas: [{ cargoPropio: c4!, monto: '100.00' }] });
    await autorizarEnLaBase([c1!, c3!, c4!]);
  });

  it('por omisión trae las vencidas con saldo: el atraso, lo autorizado y lo que falta autorizar', async () => {
    const reporte = await ver(`contrasenas-por-pagar?proveedorId=${proveedorId}`);

    expect(reporte).toMatchObject({ hoy: HOY, pagoPrometidoHasta: ayer });
    expect(reporte.filas).toMatchObject([
      {
        proveedorNombre: 'Contraseñas S.A.',
        pagoPrometido: sumarDias(HOY, -3),
        diasDeAtraso: 3,
        vence: '2026-02-10',
        documentosConSaldo: 2,
        saldo: '260.00',
        autorizado: '60.00',
        sinAutorizar: '200.00',
        impresa: false,
      },
    ]);
    expect(reporte.totales).toEqual({ cantidad: 1, saldo: '260.00', autorizado: '60.00', sinAutorizar: '200.00' });
  });

  it('con una fecha futura sirve como «por pagar esta semana» y las pagadas del todo no salen', async () => {
    const reporte = await ver(
      `contrasenas-por-pagar?proveedorId=${proveedorId}&pagoPrometidoHasta=${sumarDias(HOY, 7)}`,
    );

    expect(reporte.filas.map(({ diasDeAtraso }: { diasDeAtraso: number }) => diasDeAtraso)).toEqual([3, 0]);
    expect(reporte.totales).toMatchObject({ cantidad: 2, saldo: '560.00', autorizado: '360.00' });
  });
});

describe('permisos y Excel de R4 y R5', () => {
  const RUTAS = ['saldos-a-favor', 'contrasenas-por-pagar'];

  it('pide el permiso de ver o de exportar de cada ruta', async () => {
    const permiso = (nombre: string, accion: string) =>
      crearUsuarioConPermisos(entorno, escenario.cuenta, {
        nombres: nombre,
        apellidos: 'Proveedor',
        permisos: [`cuentas-por-pagar.reportes-de-saldos.${accion}`],
      });
    const [soloVer, soloExportar] = [await permiso('Solo ve', 'ver'), await permiso('Solo exporta', 'exportar')];

    for (const ruta of RUTAS) {
      expect((await entorno.nuevoCliente().get(`${RUTA}/${ruta}`)).estado).toBe(401);
      expect((await soloExportar.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}`)).estado).toBe(200);
      expect((await soloExportar.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(200);
    }
  });

  async function filasDe(ruta: string): Promise<string[]> {
    const exportado = await propietario().get(`${RUTA}/${ruta}`);
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

  it('R4 lleva las notas, el total por tramo, lo posiblemente prescrito y las leyendas', async () => {
    const filas = await filasDe('saldos-a-favor/exportar?corte=2026-06-30');

    expect(filas.some((fila) => fila.startsWith('Saldos a favor|Favor S.A.') && fila.includes('2024'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Posiblemente prescritos|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Nota|') && fila.includes('La prescripción no opera sola'))).toBe(true);
  });

  it('R5 lleva las contraseñas con su atraso y el total', async () => {
    const filas = await filasDe('contrasenas-por-pagar/exportar');

    expect(filas.some((fila) => fila.startsWith('Contraseñas|') && fila.includes('Contraseñas S.A.'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Total|'))).toBe(true);
  });
});
