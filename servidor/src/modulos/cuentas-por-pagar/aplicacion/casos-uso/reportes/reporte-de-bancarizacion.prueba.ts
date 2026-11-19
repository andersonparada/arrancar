import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { EfectoFiscal } from '../../../dominio/bancarizacion-de-pagos.js';
import { CargaInicialEnMemoria } from '../../../pruebas/dobles-de-saldos-iniciales.js';
import type {
  CargoDeBancarizacion,
  DocumentoSobreElUmbral,
  PagoEnEfectivoDelRango,
} from '../../puertos/puertos-de-bancarizacion-del-reporte.js';
import { ReporteDeBancarizacion, type DependenciasDeBancarizacion } from './reporte-de-bancarizacion.js';

const UMBRAL = 3_000_000;

const cargo = (id: string, cambios: Partial<CargoDeBancarizacion> = {}): CargoDeBancarizacion => ({
  documentoId: id,
  etiqueta: `A-${id}`,
  proveedorId: 'p1',
  totalCentavos: 1_120_000,
  ivaCentavos: 120_000,
  ivaAcreditableCentavos: 120_000,
  esSaldoInicial: false,
  ...cambios,
});

const pago = (id: string, fecha: string, cargos: CargoDeBancarizacion[]): PagoEnEfectivoDelRango => ({
  pagoId: id,
  recibo: `R-${id}`,
  fecha,
  proveedorId: 'p1',
  proveedorNombre: 'Proveedor p1',
  retiro: '1',
  montoCentavos: 1_000_000,
  motivoSinBancarizar: null,
  cargos,
});

interface Datos {
  pagos?: PagoEnEfectivoDelRango[];
  documentos?: DocumentoSobreElUmbral[];
  /** Lo pagado en el mes por proveedor y mes `p1|2026-02`. */
  sumas?: Record<string, number>;
  efectos?: Record<string, EfectoFiscal>;
}

function reporteCon({ pagos = [], documentos = [], sumas = {}, efectos = {} }: Datos): ReporteDeBancarizacion {
  const dependencias: DependenciasDeBancarizacion = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-03-15'),
    cargaInicial: new CargaInicialEnMemoria(),
    consultas: { proveedorExiste: async () => true } as unknown as DependenciasDeBancarizacion['consultas'],
    consultasDeBancarizacion: {
      pagosEnEfectivo: async () => pagos,
      documentosSobreElUmbral: async () => documentos,
    },
    consultasDePagos: {
      pagosDelMes: async (proveedorId, fecha) => [
        {
          numero: 1,
          anioDeNumero: 2026,
          forma: 'cheque',
          montoCentavos: sumas[`${proveedorId}|${fecha.slice(0, 7)}`] ?? 0,
          cargoIds: [],
        },
      ],
    },
    fiscal: { efectoDe: async () => new Map(Object.entries(efectos)) },
    umbral: { centavos: async () => UMBRAL },
  };
  return new ReporteDeBancarizacion(dependencias);
}

const ambos: EfectoFiscal = { iva: true, isr: true };
const pedido = { soloConEfecto: true };

describe('ReporteDeBancarizacion', () => {
  it('solo lista los meses que llegan al umbral con la suma de CP4', async () => {
    const reporte = await reporteCon({
      pagos: [pago('1', '2026-01-10', [cargo('c1')]), pago('2', '2026-02-10', [cargo('c2')])],
      sumas: { 'p1|2026-01': 3_000_000, 'p1|2026-02': 2_999_999 },
      efectos: { c1: ambos, c2: ambos },
    }).ejecutar(operadorDePrueba(), pedido);

    expect(reporte.meses.map(({ mes, sumaDelMes }) => [mes, sumaDelMes])).toEqual([['2026-01', '30000.00']]);
    expect(reporte.desde).toBe('2025-04');
    expect(reporte.hasta).toBe('2026-03');
    expect(reporte.umbral).toBe('30000.00');
  });

  it('marca el IVA completo y el cargo sin IVA, y cuenta cada cargo una vez en el mes', async () => {
    const reporte = await reporteCon({
      pagos: [pago('1', '2026-01-10', [cargo('c1')]), pago('2', '2026-01-20', [cargo('c1')])],
      sumas: { 'p1|2026-01': UMBRAL },
      efectos: { c1: ambos },
    }).ejecutar(operadorDePrueba(), pedido);

    expect(reporte.meses[0]).toMatchObject({
      efectivo: '20000.00',
      ivaEnRiesgo: '1200.00',
      costoNoDeducible: '10000.00',
    });
    expect(reporte.meses[0]!.pagos[0]!.cargos[0]!.marcas).toEqual([
      'Crédito fiscal en riesgo por bancarización',
      'Costo no deducible',
    ]);
  });

  it('con solo con efecto deja fuera los cargos sin efecto; sin él, los muestra sin marcas', async () => {
    const datos = {
      pagos: [pago('1', '2026-01-10', [cargo('c1')])],
      sumas: { 'p1|2026-01': UMBRAL },
      efectos: { c1: { iva: false, isr: false } },
    };

    const estricto = await reporteCon(datos).ejecutar(operadorDePrueba(), pedido);
    const todo = await reporteCon(datos).ejecutar(operadorDePrueba(), { soloConEfecto: false });

    expect(estricto.meses).toEqual([]);
    expect(todo.meses[0]!.pagos[0]!.cargos[0]).toMatchObject({ marcas: [], ivaEnRiesgo: '0.00' });
  });

  it('un saldo inicial con efecto avisa que el IVA no se conoce y usa su neto como costo', async () => {
    const inicial = cargo('s1', {
      esSaldoInicial: true,
      ivaCentavos: null,
      ivaAcreditableCentavos: null,
      totalCentavos: 4_000_000,
    });
    const documento: DocumentoSobreElUmbral = {
      cargo: inicial,
      proveedorNombre: 'Proveedor p1',
      pagos: [{ pagoId: '1', numero: 'R-1', forma: 'efectivo', fecha: '2026-01-10', montoCentavos: 100_000 }],
    };

    const reporte = await reporteCon({ documentos: [documento], efectos: { s1: ambos } }).ejecutar(
      operadorDePrueba(),
      pedido,
    );

    expect(reporte.documentosSobreElUmbral[0]).toMatchObject({
      ivaEnRiesgo: '0.00',
      costoNoDeducible: '40000.00',
      ivaNoConocido: true,
      efectivo: '1000.00',
    });
    expect(reporte.documentosSobreElUmbral[0]!.marcas).toContain('IVA no conocido');
  });

  it('un cargo que sale por mes y por cargo cuenta una sola vez en el total', async () => {
    const grande = cargo('c1', { totalCentavos: 4_000_000, ivaCentavos: 428_571, ivaAcreditableCentavos: 428_571 });
    const documento: DocumentoSobreElUmbral = {
      cargo: grande,
      proveedorNombre: 'Proveedor p1',
      pagos: [{ pagoId: '1', numero: 'R-1', forma: 'efectivo', fecha: '2026-01-10', montoCentavos: 3_500_000 }],
    };

    const reporte = await reporteCon({
      pagos: [pago('1', '2026-01-10', [grande])],
      documentos: [documento],
      sumas: { 'p1|2026-01': 3_500_000 },
      efectos: { c1: ambos },
    }).ejecutar(operadorDePrueba(), pedido);

    expect(reporte.totales.meses).toMatchObject({ cantidad: 1, ivaEnRiesgo: '4285.71' });
    expect(reporte.totales.documentos).toMatchObject({ cantidad: 1, ivaEnRiesgo: '4285.71' });
    expect(reporte.totales.total).toEqual({ ivaEnRiesgo: '4285.71', costoNoDeducible: '35714.29' });
  });

  it('rechaza más de 48 meses', async () => {
    await expect(
      reporteCon({}).ejecutar(operadorDePrueba(), { ...pedido, desde: '2022-03', hasta: '2026-03' }),
    ).rejects.toMatchObject({ codigo: 'rango_de_reporte_muy_largo' });
  });
});
