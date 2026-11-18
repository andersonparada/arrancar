import { describe, expect, it } from 'vitest';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import { anterioresAlInicioDe, estaVencido, saldoDe } from './saldos.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
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
  totalCentavos: 11200,
  retencionesCentavos: 1200,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  ingresadoPor: null,
  estado: 'registrado',
  registradoEn: null,
  registradoPor: null,
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

describe('saldo de un documento', () => {
  it('un cargo debe su total menos las retenciones y menos lo que le aplicaron las notas', () => {
    expect(saldoDe(documento(), nada)).toEqual({
      netoCentavos: 10000,
      aplicadoCentavos: 0,
      ajustadoCentavos: 0,
      pagadoCentavos: 0,
      reintegradoCentavos: 0,
      deudaCentavos: 10000,
      comprometidoCentavos: 0,
      disponibleCentavos: 10000,
    });
    expect(saldoDe(documento(), { ...nada, alCargoCentavos: 2500, porLaNotaCentavos: 99 })).toEqual({
      netoCentavos: 10000,
      aplicadoCentavos: 2500,
      ajustadoCentavos: 0,
      pagadoCentavos: 0,
      reintegradoCentavos: 0,
      deudaCentavos: 7500,
      comprometidoCentavos: 0,
      disponibleCentavos: 7500,
    });
  });

  it('una nota de crédito tiene como saldo libre lo que no aplicó, sin restar retenciones', () => {
    const nota = documento({ tipo: 'nota_de_credito', retencionesCentavos: 0, totalCentavos: 5000, vencimiento: null });

    expect(saldoDe(nota, { ...nada, porLaNotaCentavos: 3800 })).toEqual({
      netoCentavos: 5000,
      aplicadoCentavos: 3800,
      ajustadoCentavos: 0,
      pagadoCentavos: 0,
      reintegradoCentavos: 0,
      deudaCentavos: 1200,
      comprometidoCentavos: 0,
      disponibleCentavos: 1200,
    });
  });

  it('un documento anulado no debe nada ni deja nada a favor', () => {
    expect(saldoDe(documento({ estado: 'anulado' }), nada).disponibleCentavos).toBe(0);
    expect(saldoDe(documento({ tipo: 'nota_de_credito', estado: 'anulado' }), nada).disponibleCentavos).toBe(0);
  });
});

describe('saldo con pagos, ajustes y reintegros', () => {
  it('un cargo resta lo pagado (también lo posfechado) y la diferencia menor ajustada', () => {
    const resultado = saldoDe(documento(), {
      ...nada,
      alCargoCentavos: 1000,
      pagadoCentavos: 6000,
      ajustadoCentavos: 3,
    });

    expect(resultado).toMatchObject({ pagadoCentavos: 6000, ajustadoCentavos: 3, disponibleCentavos: 2997 });
  });

  it('un cargo pagado del todo queda en cero y con un pago de más queda negativo (el dominio lo evita antes)', () => {
    expect(saldoDe(documento(), { ...nada, pagadoCentavos: 10000 }).disponibleCentavos).toBe(0);
    expect(saldoDe(documento(), { ...nada, pagadoCentavos: 10001 }).disponibleCentavos).toBe(-1);
  });

  it('una nota resta lo reintegrado de su saldo libre y no cuenta pagos', () => {
    const nota = documento({ tipo: 'nota_de_credito', retencionesCentavos: 0, totalCentavos: 5000, vencimiento: null });

    const resultado = saldoDe(nota, {
      ...nada,
      porLaNotaCentavos: 1000,
      ajustadoCentavos: 500,
      reintegradoCentavos: 1500,
      pagadoCentavos: 99,
    });

    expect(resultado).toMatchObject({ reintegradoCentavos: 1500, pagadoCentavos: 0, disponibleCentavos: 2000 });
  });

  it('un cargo no resta reintegros', () => {
    expect(saldoDe(documento(), { ...nada, reintegradoCentavos: 500 }).disponibleCentavos).toBe(10000);
  });

  it('un saldo inicial paga contra su saldo al inicio', () => {
    const inicial = documento({ origen: 'saldo_inicial', documentoId: null, saldoAlInicioCentavos: 7000 });

    expect(saldoDe(inicial, { ...nada, pagadoCentavos: 7000 }).disponibleCentavos).toBe(0);
  });
});

describe('saldo de un saldo inicial', () => {
  const saldoInicial = (cambios: Partial<DocumentoPorPagar> = {}) =>
    documento({
      origen: 'saldo_inicial',
      documentoId: null,
      totalCentavos: 11200,
      retencionesCentavos: 1200,
      saldoAlInicioCentavos: 7000,
      retencionesPorPracticarCentavos: 500,
      ...cambios,
    });

  it('el neto es lo que faltaba pagar al corte, sin restar las retenciones por practicar', () => {
    expect(saldoDe(saldoInicial(), nada)).toEqual({
      netoCentavos: 7000,
      aplicadoCentavos: 0,
      ajustadoCentavos: 0,
      pagadoCentavos: 0,
      reintegradoCentavos: 0,
      deudaCentavos: 7000,
      comprometidoCentavos: 0,
      disponibleCentavos: 7000,
    });
  });

  it('las notas aplicadas se restan del saldo al inicio', () => {
    expect(saldoDe(saldoInicial(), { ...nada, alCargoCentavos: 2000 }).disponibleCentavos).toBe(5000);
  });

  it('una nota de crédito cargada como saldo inicial tiene a favor su saldo al inicio', () => {
    const nota = saldoInicial({
      tipo: 'nota_de_credito',
      retencionesCentavos: 0,
      saldoAlInicioCentavos: 3000,
      vencimiento: null,
    });

    expect(saldoDe(nota, { ...nada, porLaNotaCentavos: 1000 }).disponibleCentavos).toBe(2000);
  });
});

describe('pagos y notas anteriores a la fecha de inicio', () => {
  const inicial = (cambios: Partial<DocumentoPorPagar> = {}) =>
    documento({ origen: 'saldo_inicial', documentoId: null, saldoAlInicioCentavos: 7000, ...cambios });

  it('un cargo: total menos retenciones menos lo que faltaba al corte', () => {
    expect(anterioresAlInicioDe(inicial())).toBe(3000);
  });

  it('una nota de crédito: su total menos lo que quedaba a favor', () => {
    const nota = inicial({ tipo: 'nota_de_credito', retencionesCentavos: 0, saldoAlInicioCentavos: 9000 });

    expect(anterioresAlInicioDe(nota)).toBe(2200);
  });

  it('cero si no hubo pagos anteriores, y nulo en un documento del libro', () => {
    expect(anterioresAlInicioDe(inicial({ saldoAlInicioCentavos: 10000 }))).toBe(0);
    expect(anterioresAlInicioDe(documento())).toBeNull();
  });
});

describe('cargo vencido', () => {
  it('vence cuando aún se debe algo y el vencimiento ya pasó', () => {
    expect(estaVencido(documento(), 10000, '2026-04-11')).toBe(true);
    expect(estaVencido(documento(), 10000, '2026-04-10')).toBe(false);
  });

  it('pagado del todo, anulado, o una nota de crédito, no vence', () => {
    expect(estaVencido(documento(), 0, '2026-12-01')).toBe(false);
    expect(estaVencido(documento({ estado: 'anulado' }), 10000, '2026-12-01')).toBe(false);
    expect(estaVencido(documento({ tipo: 'nota_de_credito', vencimiento: null }), 500, '2026-12-01')).toBe(false);
  });
});
