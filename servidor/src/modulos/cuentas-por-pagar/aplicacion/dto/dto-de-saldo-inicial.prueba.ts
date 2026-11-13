import { describe, expect, it } from 'vitest';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { FilaDeDocumento } from '../puertos/puertos-de-consultas.js';
import { datosDeSolicitud, dtoDeSaldoInicial } from './dto-de-saldo-inicial.js';

function fila(cambios: Partial<FilaDeDocumento> = {}, documento: Partial<DocumentoPorPagar> = {}): FilaDeDocumento {
  return {
    documento: {
      id: 'id',
      origen: 'saldo_inicial',
      documentoId: null,
      serie: 'A',
      numero: '1',
      tipo: 'factura',
      proveedorId: 'proveedor',
      documentoAfectadoId: null,
      fechaEmision: '2025-12-20',
      totalCentavos: 112000,
      retencionesCentavos: 12000,
      saldoAlInicioCentavos: 90000,
      retencionesPorPracticarCentavos: 4000,
      referencia: null,
      tieneActivoFijo: false,
      vencimiento: '2026-01-20',
      estado: 'registrado',
      ingresadoPor: null,
      registradoEn: null,
      registradoPor: null,
      autorizadoEn: null,
      autorizadoPor: null,
      autorizacionPropia: false,
      ...documento,
    },
    libro: {
      proveedorNombre: 'Proveedor',
      proveedorNit: '1234567',
      fechaRecepcion: null,
      periodo: null,
      anulacion: { causa: null, motivo: null, anuladoPor: null, anuladoPorNombre: null, anuladoEn: null },
    },
    creadoEn: '2026-03-10T00:00:00.000Z',
    aplicadoAlCargoCentavos: 0,
    aplicadoPorLaNotaCentavos: 0,
    ajustadoCentavos: 0,
    ajustesVigentes: 0,
    aplicacionesManualesRecibidas: 0,
    notasVigentes: 0,
    notasEnTotal: 0,
    ...cambios,
  };
}

describe('datosDeSolicitud', () => {
  it('pasa el dinero a centavos y lo que no viene vale cero', () => {
    const datos = datosDeSolicitud({
      proveedorId: 'p',
      tipo: 'factura',
      serie: null,
      numero: '1',
      fechaEmision: '2025-12-20',
      vencimiento: null,
      total: '1120.50',
      saldoPendiente: '900',
      referencia: null,
    });

    expect(datos).toMatchObject({
      totalCentavos: 112050,
      saldoPendienteCentavos: 90000,
      retencionesCentavos: 0,
      retencionesPorPracticarCentavos: 0,
      tieneActivoFijo: false,
    });
  });
});

describe('dtoDeSaldoInicial', () => {
  it('muestra el saldo al corte, lo anterior al corte y el saldo de hoy tras las notas', () => {
    const dto = dtoDeSaldoInicial(fila({ aplicadoAlCargoCentavos: 5000 }), false);

    expect(dto).toMatchObject({
      saldoPendiente: '900.00',
      anterioresAlInicio: '100.00',
      saldo: '850.00',
      retencionesPorPracticar: '40.00',
    });
  });

  it('se puede corregir y eliminar con la carga abierta, completado y sin movimientos', () => {
    expect(dtoDeSaldoInicial(fila(), false)).toMatchObject({ puedeCorregir: true, puedeEliminar: true });
  });

  it.each([
    ['la carga cerrada', fila(), true],
    ['autorizado', fila({}, { estado: 'autorizado' }), false],
    ['una nota aplicada', fila({ aplicadoAlCargoCentavos: 100 }), false],
    ['una nota de crédito que ya rebajó', fila({ aplicadoPorLaNotaCentavos: 100 }), false],
  ])('no se puede corregir ni eliminar con %s', (_caso, entrada, cerrada) => {
    expect(dtoDeSaldoInicial(entrada, cerrada)).toMatchObject({ puedeCorregir: false, puedeEliminar: false });
  });
});
