import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ReporteDeDocumentosAUnaFecha, ReporteDeSaldosPorProveedor } from '../../servicios/tipos-de-reportes';
import { filasDeConciliacion, reporteDeSaldosVacio, totalesDeDocumentos, totalesDeSaldos } from './resumen-de-reportes';

beforeEach(() => setActivePinia(createPinia()));

const CIFRAS = {
  porVencer: '0.00',
  de1a30: '0.00',
  de31a60: '0.00',
  de61a90: '0.00',
  masDe90: '0.00',
  sinVencimiento: '0.00',
  totalCargos: '0.00',
  saldosAFavor: '0.00',
  saldoNeto: '0.00',
  comprometido: '0.00',
  disponible: null,
  sinAutorizar: '0.00',
};
const saldos = {
  corte: '2026-11-15',
  acreedores: [],
  deudores: [],
  totales: {
    acreedores: { ...CIFRAS, saldoNeto: '1500.00', comprometido: '200.00', disponible: '1800.00' },
    deudores: { ...CIFRAS, saldoNeto: '300.00' },
    saldoNeto: '1200.00',
    cargosPorTramo: CIFRAS,
    porcentajesPorTramo: CIFRAS,
    totalCargos: '2000.00',
  },
} as unknown as ReporteDeSaldosPorProveedor;

describe('resumen de los reportes', () => {
  it('R1 pone primero el saldo neto de Proveedores', () => {
    const totales = totalesDeSaldos(saldos);
    expect(totales[0]).toMatchObject({
      etiqueta: 'Saldo neto de Proveedores',
      valor: formatearMonto('1200.00'),
      destacado: true,
    });
    expect(totales.map((t) => t.valor)).toContain(formatearMonto('300.00'));
  });

  it('R1 trae «Disponible para pagar» (cargos menos comprometido) en el resumen', () => {
    const disponible = totalesDeSaldos(saldos).find((t) => t.etiqueta === 'Disponible para pagar');
    expect(disponible?.valor).toBe(formatearMonto('1800.00'));
  });

  it('R1 sin acreedores ni deudores está vacío', () => {
    expect(reporteDeSaldosVacio(saldos)).toBe(true);
    expect(reporteDeSaldosVacio({ ...saldos, deudores: [{} as never] })).toBe(false);
  });

  it('R2 totaliza todo lo filtrado y cuenta en singular o plural', () => {
    const documentos = {
      total: 1,
      totales: {
        total: '1000.00',
        retenciones: '0.00',
        pagado: '100.00',
        saldo: '900.00',
        comprometido: '0.00',
        disponible: '900.00',
      },
    } as ReporteDeDocumentosAUnaFecha;
    expect(totalesDeDocumentos(documentos)[0]).toMatchObject({ etiqueta: 'Saldo', valor: formatearMonto('900.00') });
    expect(totalesDeDocumentos(documentos)[1]?.etiqueta).toBe('Documento');
    expect(totalesDeDocumentos(documentos).at(-1)).toMatchObject({
      etiqueta: 'Disponible para pagar',
      valor: formatearMonto('900.00'),
    });
    expect(totalesDeDocumentos({ ...documentos, total: 2 })[1]?.etiqueta).toBe('Documentos');
  });

  it('R1 muestra la conciliación con los pagos por aplicar solo si el servidor la manda', () => {
    expect(filasDeConciliacion(saldos)).toBeNull();
    const filas = filasDeConciliacion({
      ...saldos,
      conciliacion: {
        saldoNetoDelAuxiliar: '1200.00',
        pagosPorAplicar: '200.00',
        proveedoresNetoDePagosPorAplicar: '1000.00',
      },
    });
    expect(filas?.map((f) => f.valor)).toEqual([
      formatearMonto('1200.00'),
      formatearMonto('200.00'),
      formatearMonto('1000.00'),
    ]);
    expect(filas?.filter((f) => f.total)).toHaveLength(1);
  });
});
