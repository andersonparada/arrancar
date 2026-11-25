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

describe('diferencia de las cifras de ventas de la foto', () => {
  const ventas = (debito: string, cantidad: string): Partial<FotoDelPeriodo> => ({
    ventas: [
      {
        modulo: 'libro-de-ventas',
        clave: 'ventas',
        cifras: [
          { clave: 'debito', etiqueta: 'Débito fiscal', tipo: 'monto', valor: debito },
          { clave: 'operaciones', etiqueta: 'Operaciones', tipo: 'cantidad', valor: cantidad },
        ],
      },
    ],
  });

  it('compara también las cifras de ventas, montos y cantidades', () => {
    const { cambios } = diferenciaDeFotos(foto(ventas('10.00', '2')), foto(ventas('25.50', '3')));

    expect(cambios).toEqual([
      { clave: 'ventas[libro-de-ventas].debito', anterior: '10.00', actual: '25.50', cambio: '15.50' },
      { clave: 'ventas[libro-de-ventas].operaciones', anterior: '2', actual: '3', cambio: '1' },
    ]);
  });

  it('una foto sin respuesta de ventas contra una con ventas no tiene punto de comparación', () => {
    expect(diferenciaDeFotos(foto(), foto(ventas('10.00', '2'))).cambios).toEqual([]);
  });

  it('una foto con ventas contra una sin respuesta (módulo desactivado) no inventa un cambio a cero', () => {
    expect(diferenciaDeFotos(foto(ventas('120.00', '2')), foto()).cambios).toEqual([]);
  });

  it('las mismas cifras de ventas no dan diferencia', () => {
    expect(diferenciaDeFotos(foto(ventas('10.00', '2')), foto(ventas('10.00', '2'))).cambios).toEqual([]);
  });
});

describe('diferencia del remanente de retenciones de la foto', () => {
  const remanentes = (alSiguiente: string): Partial<FotoDelPeriodo> => ({
    remanentes: {
      formulario: 'SAT-2237',
      retencionesDelPeriodo: '100.00',
      remanenteAnterior: '0.00',
      impuestoDelMes: '0.00',
      impuestoAPagar: '0.00',
      remanenteAlSiguiente: alSiguiente,
    },
  });

  it('compara el remanente cuando las dos fotos lo traen', () => {
    const { cambios } = diferenciaDeFotos(foto(remanentes('100.00')), foto(remanentes('70.00')));

    expect(cambios).toEqual([
      { clave: 'remanentes.remanenteAlSiguiente', anterior: '100.00', actual: '70.00', cambio: '-30.00' },
    ]);
  });

  it('sin remanente en alguna de las dos no hay punto de comparación', () => {
    expect(diferenciaDeFotos(foto(), foto(remanentes('70.00'))).cambios).toEqual([]);
    expect(diferenciaDeFotos(foto(remanentes('70.00')), foto()).cambios).toEqual([]);
  });
});
