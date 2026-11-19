import { describe, expect, it } from 'vitest';
import {
  ESTADOS_DE_PAGO,
  estadoDePagoDe,
  estaPosfechado,
  numeroDelPago,
  pagadoYComprometido,
  posfechadosDe,
} from './pagos.js';

const HOY = '2026-11-14';

describe('pagado y comprometido', () => {
  it('un pago con fecha de hoy o anterior es pagado y uno con fecha futura queda comprometido', () => {
    const pagos = [
      { fecha: '2026-11-01', montoCentavos: 3000 },
      { fecha: HOY, montoCentavos: 2000 },
      { fecha: '2026-11-15', montoCentavos: 5000 },
    ];

    expect(pagadoYComprometido(pagos, HOY)).toEqual({ pagadoCentavos: 5000, comprometidoCentavos: 5000 });
  });

  it('al llegar la fecha del cheque, lo comprometido pasa a pagado', () => {
    const cheque = [{ fecha: '2026-11-20', montoCentavos: 5000 }];

    expect(pagadoYComprometido(cheque, '2026-11-19')).toEqual({ pagadoCentavos: 0, comprometidoCentavos: 5000 });
    expect(pagadoYComprometido(cheque, '2026-11-20')).toEqual({ pagadoCentavos: 5000, comprometidoCentavos: 0 });
  });

  it('sin pagos todo es cero, y solo lo posterior a hoy está posfechado', () => {
    expect(pagadoYComprometido([], HOY)).toEqual({ pagadoCentavos: 0, comprometidoCentavos: 0 });
    expect(estaPosfechado({ fecha: HOY, montoCentavos: 1 }, HOY)).toBe(false);
    expect(estaPosfechado({ fecha: '2026-11-15', montoCentavos: 1 }, HOY)).toBe(true);
  });
});

describe('estado de pago', () => {
  const cifras = (deudaCentavos: number, pagadoCentavos: number, comprometidoCentavos: number) => ({
    deudaCentavos,
    pagadoCentavos,
    comprometidoCentavos,
  });

  it('pendiente si no se ha pagado ni comprometido nada', () => {
    expect(estadoDePagoDe(cifras(10000, 0, 0))).toBe('pendiente');
  });

  it('un cargo con una nota aplicada y sin pagos sigue pendiente (la deuda ya la trae rebajada)', () => {
    expect(estadoDePagoDe(cifras(7000, 0, 0))).toBe('pendiente');
  });

  it('pagado en parte si se pagó algo y queda disponible', () => {
    expect(estadoDePagoDe(cifras(4000, 6000, 0))).toBe('en_parte');
    expect(estadoDePagoDe(cifras(4000, 2000, 1000))).toBe('en_parte');
  });

  it('comprometido en parte si solo hay cheques posfechados y queda disponible', () => {
    expect(estadoDePagoDe(cifras(10000, 0, 6000))).toBe('comprometido_en_parte');
  });

  it('comprometido si la deuda está cubierta por cheques posfechados, con o sin algo pagado', () => {
    expect(estadoDePagoDe(cifras(6000, 0, 6000))).toBe('comprometido');
    expect(estadoDePagoDe(cifras(6000, 4000, 6000))).toBe('comprometido');
  });

  it('pagado si ya no se debe nada', () => {
    expect(estadoDePagoDe(cifras(0, 10000, 0))).toBe('pagado');
  });

  it('cubre todos los casos con los cinco estados', () => {
    const grilla = [0, 5000, 10000].flatMap((deuda) =>
      [0, 3000].flatMap((pagado) =>
        [0, 5000, 10000].filter((comprometido) => comprometido <= deuda).map((c) => cifras(deuda, pagado, c)),
      ),
    );
    const vistos = new Set(grilla.map(estadoDePagoDe));
    expect([...vistos].sort()).toEqual([...ESTADOS_DE_PAGO].sort());
  });
});

describe('posfechados de un cargo', () => {
  it('da la fecha del cheque más lejano y cuántos hay', () => {
    const pagos = [
      { fecha: '2026-11-01', montoCentavos: 3000 },
      { fecha: '2026-12-10', montoCentavos: 2000 },
      { fecha: '2026-11-30', montoCentavos: 5000 },
    ];

    expect(posfechadosDe(pagos, HOY)).toEqual({ comprometidoHasta: '2026-12-10', chequesPosfechados: 2 });
  });

  it('sin posfechados no hay fecha', () => {
    expect(posfechadosDe([{ fecha: HOY, montoCentavos: 1 }], HOY)).toEqual({
      comprometidoHasta: null,
      chequesPosfechados: 0,
    });
  });
});

describe('número del pago', () => {
  it('lleva el año solo si la empresa reinicia sus correlativos', () => {
    expect(numeroDelPago(15, 0)).toBe('15');
    expect(numeroDelPago(15, 2026)).toBe('2026-15');
  });
});
