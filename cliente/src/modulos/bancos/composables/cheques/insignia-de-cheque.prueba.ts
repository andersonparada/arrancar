import { describe, expect, it } from 'vitest';
import { insigniaDeCheque, insigniaDeChequeListado } from './insignia-de-cheque';

describe('insigniaDeCheque', () => {
  it('un cheque disponible no lleva etiqueta y uno emitido dice «Emitido»', () => {
    expect(insigniaDeCheque({ estado: 'disponible', parteDeApertura: null })).toBeUndefined();
    expect(insigniaDeCheque({ estado: 'emitido', parteDeApertura: null })).toBe('Emitido');
  });

  it('uno de la carga inicial dice «Carga inicial»', () => {
    expect(insigniaDeCheque({ estado: 'emitido', parteDeApertura: 'cheque_en_circulacion' })).toBe('Carga inicial');
    expect(insigniaDeCheque({ estado: 'emitido', parteDeApertura: 'cheque_posfechado' })).toBe('Carga inicial');
  });

  it('en la lista de la empresa «Emitido» no se muestra', () => {
    expect(insigniaDeChequeListado({ estado: 'emitido', parteDeApertura: null })).toBeUndefined();
    expect(insigniaDeChequeListado({ estado: 'emitido', parteDeApertura: 'cheque_posfechado' })).toBe('Carga inicial');
    expect(insigniaDeChequeListado({ estado: 'anulado', parteDeApertura: null })).toBe('Anulado');
  });

  it('anulado manda sobre la carga inicial', () => {
    expect(insigniaDeCheque({ estado: 'anulado', parteDeApertura: 'cheque_en_circulacion' })).toBe('Anulado');
  });

  it('un anulado dice cómo terminó y uno impreso dice «Impreso»', () => {
    const anulado = { estado: 'anulado' as const, parteDeApertura: null };
    expect(insigniaDeCheque({ ...anulado, causaDeAnulacion: 'inutilizado' })).toBe('Inutilizado');
    expect(insigniaDeCheque({ ...anulado, causaDeAnulacion: 'extraviado' })).toBe('Extraviado');
    expect(insigniaDeCheque({ estado: 'emitido', parteDeApertura: null, impresoEn: '2026-09-27T10:00:00.000Z' })).toBe(
      'Impreso',
    );
  });

  it('uno de la carga inicial nunca dice «Impreso»', () => {
    expect(insigniaDeCheque({ estado: 'emitido', parteDeApertura: 'cheque_en_circulacion', impresoEn: null })).toBe(
      'Carga inicial',
    );
  });
});
