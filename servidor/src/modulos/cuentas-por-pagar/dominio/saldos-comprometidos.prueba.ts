import { describe, expect, it } from 'vitest';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import { estaVencido, saldoDe } from './saldos.js';

const factura = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: crypto.randomUUID(),
  origen: 'libro_de_compras',
  documentoId: crypto.randomUUID(),
  serie: 'A',
  numero: '100',
  tipo: 'factura',
  proveedorId: crypto.randomUUID(),
  documentoAfectadoId: null,
  facturaDelSistemaAnterior: false,
  fechaEmision: '2026-03-10',
  totalCentavos: 10000,
  retencionesCentavos: 0,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  ingresadoPor: null,
  estado: 'autorizado',
  registradoPor: null,
  registradoEn: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  ...cambios,
});

const nada = {
  alCargoCentavos: 0,
  porLaNotaCentavos: 0,
  ajustadoCentavos: 0,
  pagadoCentavos: 0,
  reintegradoCentavos: 0,
};

describe('deuda, comprometido y disponible', () => {
  it('un posfechado que cubre todo deja la deuda entera y nada disponible', () => {
    const saldo = saldoDe(factura(), { ...nada, pagadoCentavos: 10000, comprometidoCentavos: 10000 });

    expect(saldo).toMatchObject({ deudaCentavos: 10000, comprometidoCentavos: 10000, disponibleCentavos: 0 });
  });

  it('un posfechado parcial deja disponible el resto', () => {
    const saldo = saldoDe(factura(), { ...nada, pagadoCentavos: 4000, comprometidoCentavos: 4000 });

    expect(saldo).toMatchObject({ deudaCentavos: 10000, comprometidoCentavos: 4000, disponibleCentavos: 6000 });
  });

  it('con un pago de hoy (4000) y un posfechado (3000), la deuda solo baja con lo de hoy', () => {
    const saldo = saldoDe(factura(), { ...nada, pagadoCentavos: 7000, comprometidoCentavos: 3000 });

    expect(saldo).toMatchObject({ deudaCentavos: 6000, comprometidoCentavos: 3000, disponibleCentavos: 3000 });
  });

  it('una nota aplicada y un ajuste bajan la deuda y lo disponible por igual', () => {
    const saldo = saldoDe(factura(), {
      ...nada,
      alCargoCentavos: 2000,
      ajustadoCentavos: 5,
      pagadoCentavos: 3000,
      comprometidoCentavos: 3000,
    });

    expect(saldo).toMatchObject({ deudaCentavos: 7995, comprometidoCentavos: 3000, disponibleCentavos: 4995 });
  });

  it('sin decir cuánto está comprometido, la deuda es igual a lo disponible', () => {
    const saldo = saldoDe(factura(), { ...nada, pagadoCentavos: 3000 });

    expect(saldo).toMatchObject({ deudaCentavos: 7000, comprometidoCentavos: 0, disponibleCentavos: 7000 });
  });

  it('una nota de crédito no tiene comprometido: su saldo libre es deuda y disponible', () => {
    const nota = factura({ tipo: 'nota_de_credito', vencimiento: null });

    const saldo = saldoDe(nota, { ...nada, porLaNotaCentavos: 4000, comprometidoCentavos: 999 });

    expect(saldo).toMatchObject({ deudaCentavos: 6000, comprometidoCentavos: 0, disponibleCentavos: 6000 });
  });

  it('un documento anulado no debe ni compromete nada', () => {
    const anulado = factura({ estado: 'anulado' });

    const saldo = saldoDe(anulado, { ...nada, pagadoCentavos: 5000, comprometidoCentavos: 5000 });

    expect(saldo).toMatchObject({ deudaCentavos: 0, comprometidoCentavos: 0, disponibleCentavos: 0 });
  });

  it('un cargo vencido y comprometido entero sigue vencido porque aún se debe', () => {
    const { deudaCentavos } = saldoDe(factura(), { ...nada, pagadoCentavos: 10000, comprometidoCentavos: 10000 });

    expect(estaVencido(factura({ vencimiento: '2026-04-10' }), deudaCentavos, '2026-04-11')).toBe(true);
  });
});
