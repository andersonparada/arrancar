import { describe, expect, it } from 'vitest';
import { estadoDePagoDe, estaPosfechado, numeroDelPago, pagadoYComprometido } from './pagos.js';

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
  const cifras = (saldoCentavos: number, pagadoCentavos: number, comprometidoCentavos: number) => ({
    saldoCentavos,
    pagadoCentavos,
    comprometidoCentavos,
  });

  it('pendiente si no se ha pagado ni comprometido nada', () => {
    expect(estadoDePagoDe(cifras(10000, 0, 0))).toBe('pendiente');
  });

  it('en parte si se pagó o se comprometió algo y queda saldo', () => {
    expect(estadoDePagoDe(cifras(4000, 6000, 0))).toBe('en_parte');
    expect(estadoDePagoDe(cifras(4000, 0, 6000))).toBe('en_parte');
  });

  it('comprometido si ya no se debe nada pero hay un pago con fecha futura', () => {
    expect(estadoDePagoDe(cifras(0, 4000, 6000))).toBe('comprometido');
  });

  it('pagado si ya no se debe nada y nada está comprometido', () => {
    expect(estadoDePagoDe(cifras(0, 10000, 0))).toBe('pagado');
  });
});

describe('número del pago', () => {
  it('lleva el año solo si la empresa reinicia sus correlativos', () => {
    expect(numeroDelPago(15, 0)).toBe('15');
    expect(numeroDelPago(15, 2026)).toBe('2026-15');
  });
});
