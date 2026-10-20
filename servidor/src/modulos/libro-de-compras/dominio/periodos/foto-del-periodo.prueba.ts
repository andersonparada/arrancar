import { describe, expect, it } from 'vitest';
import { diferenciaDeFotos, type FotoDelPeriodo } from './foto-del-periodo.js';

const foto = (cambios: Partial<FotoDelPeriodo> = {}, resumen: Record<string, unknown> = {}): FotoDelPeriodo => ({
  version: 1,
  tipoDeLibro: 'completo',
  documentos: 2,
  huella: 'a'.repeat(64),
  resumen: {
    totales: { total: '224.00', iva: '24.00' },
    porTipoDte: [{ tipoDte: 'FACT', cantidad: 2, total: '224.00' }],
    creditoFiscalDelPeriodo: '24.00',
    ...resumen,
  },
  ...cambios,
});

describe('diferencia entre dos fotos', () => {
  it('dos fotos iguales no tienen diferencia', () => {
    expect(diferenciaDeFotos(foto(), foto())).toEqual({ cambios: [], huellaCambio: false });
  });

  it('dice, cifra por cifra, lo que cambió: anterior, actual y cambio', () => {
    const despues = foto(
      { documentos: 3, huella: 'b'.repeat(64) },
      {
        totales: { total: '336.00', iva: '36.00' },
        porTipoDte: [{ tipoDte: 'FACT', cantidad: 3, total: '336.00' }],
        creditoFiscalDelPeriodo: '36.00',
      },
    );

    const { cambios, huellaCambio } = diferenciaDeFotos(foto(), despues);

    expect(huellaCambio).toBe(true);
    expect(cambios).toEqual(
      expect.arrayContaining([
        { clave: 'documentos', anterior: '2', actual: '3', cambio: '1' },
        { clave: 'resumen.totales.total', anterior: '224.00', actual: '336.00', cambio: '112.00' },
        { clave: 'resumen.creditoFiscalDelPeriodo', anterior: '24.00', actual: '36.00', cambio: '12.00' },
        { clave: 'resumen.porTipoDte[FACT].cantidad', anterior: '2', actual: '3', cambio: '1' },
      ]),
    );
    expect(cambios).toHaveLength(6);
  });

  it('un código DTE que aparece o desaparece cuenta contra cero, con signo', () => {
    const sinNotas = foto();
    const conNota = foto(
      {},
      {
        porTipoDte: [
          { tipoDte: 'FACT', cantidad: 2, total: '224.00' },
          { tipoDte: 'NCRE', cantidad: 1, total: '-56.00' },
        ],
      },
    );

    const { cambios } = diferenciaDeFotos(sinNotas, conNota);

    expect(cambios).toEqual([
      { clave: 'resumen.porTipoDte[NCRE].cantidad', anterior: '0', actual: '1', cambio: '1' },
      { clave: 'resumen.porTipoDte[NCRE].total', anterior: '0.00', actual: '-56.00', cambio: '-56.00' },
    ]);
  });

  it('una baja del crédito sale con signo negativo', () => {
    const { cambios } = diferenciaDeFotos(foto(), foto({}, { creditoFiscalDelPeriodo: '12.00' }));

    expect(cambios).toEqual([
      { clave: 'resumen.creditoFiscalDelPeriodo', anterior: '24.00', actual: '12.00', cambio: '-12.00' },
    ]);
  });

  it('la huella puede cambiar sin que cambie ninguna cifra (un monto que se movió de columna)', () => {
    expect(diferenciaDeFotos(foto(), foto({ huella: 'c'.repeat(64) }))).toEqual({ cambios: [], huellaCambio: true });
  });
});
