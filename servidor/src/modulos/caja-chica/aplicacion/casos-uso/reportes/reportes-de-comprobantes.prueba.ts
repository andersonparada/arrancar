import { describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { dependencias, deReporte, vale } from './dobles-de-reportes.soporte.js';
import { ReporteDeGastosSinDocumento, ReporteDePendientesDeReponer } from './reportes-de-comprobantes.js';

const operador = operadorDePrueba();

describe('CC-R1: pendientes de reponer al corte', () => {
  it('agrupa por fondo, separa lo deducible y resta las notas de crédito', async () => {
    const reporte = await new ReporteDePendientesDeReponer(
      dependencias({
        pendientesAlCorte: async () => [
          deReporte({ id: 'c1' }),
          deReporte({ id: 'c2', montoCentavos: 2_500, resta: true, esNotaDeCredito: true }),
          vale(),
          deReporte({ id: 'c3', fondoId: 'f2', montoCentavos: 700 }, 'Combustible', 'Fondo Bodega'),
        ],
      }),
    ).ejecutar(operador, {});
    expect(reporte.corte).toBe('2026-10-20');
    expect(reporte.fondos.map((f) => f.fondoNombre)).toEqual(['Fondo Bodega', 'Fondo Central']);
    const central = reporte.fondos[1]!;
    expect(central).toMatchObject({ cantidad: 3, deducible: '75.00', noDeducible: '50.00', total: '125.00' });
    expect(central.filas[1]).toMatchObject({ monto: '-25.00', deducible: true });
    expect(central.filas[2]).toMatchObject({ documento: 'Vale 5', deducible: false, proveedor: 'Pedro López' });
    expect(reporte.total).toEqual({ cantidad: 4, deducible: '82.00', noDeducible: '50.00', total: '132.00' });
  });

  it('pide el corte y el fondo a la lectura, y sin datos da un reporte vacío', async () => {
    const pedidos: unknown[] = [];
    const reporte = await new ReporteDePendientesDeReponer(
      dependencias({
        pendientesAlCorte: async (filtro) => {
          pedidos.push(filtro);
          return [];
        },
      }),
    ).ejecutar(operador, { corte: '2026-09-30', fondoId: 'f1' });
    expect(pedidos).toEqual([{ corte: '2026-09-30', fondoId: 'f1' }]);
    expect(reporte.fondos).toEqual([]);
    expect(reporte.total.total).toBe('0.00');
  });
});

describe('CC-R3: gastos sin documento fiscal', () => {
  it('toma el mes de la fecha por omisión y explica cada motivo', async () => {
    const pedidos: unknown[] = [];
    const reporte = await new ReporteDeGastosSinDocumento(
      dependencias({
        sinDocumentoFiscal: async (filtro) => {
          pedidos.push(filtro);
          return [
            vale(),
            deReporte({
              id: 'c9',
              documento: {
                tipo: 'RECI',
                serie: null,
                numero: '9',
                proveedorNombre: 'Tienda',
                fechaEmision: '2026-10-11',
                totalCentavos: 3_000,
                enElLibro: false,
                motivoFueraDelLibro: 'fel_a_consumidor_final',
              },
              montoCentavos: 3_000,
            }),
          ];
        },
      }),
    ).ejecutar(operador, {});
    expect(pedidos).toEqual([{ desde: '2026-10-01', hasta: '2026-10-20', fondoId: undefined }]);
    const filas = reporte.fondos[0]!.filas;
    expect(filas.map((f) => f.motivo)).toEqual(['El peaje no da factura', 'La FEL está a nombre de consumidor final']);
    expect(reporte.total).toMatchObject({ cantidad: 2, deducible: '0.00', noDeducible: '80.00', total: '80.00' });
  });

  it('rechaza un período invertido', async () => {
    const caso = new ReporteDeGastosSinDocumento(dependencias({}));
    await expect(caso.ejecutar(operador, { desde: '2026-10-20', hasta: '2026-10-01' })).rejects.toMatchObject({
      codigo: 'periodo_invertido',
    });
  });
});
