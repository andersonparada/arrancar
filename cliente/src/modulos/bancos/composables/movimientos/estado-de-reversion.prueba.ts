import { describe, expect, it } from 'vitest';
import { esDeSoloLectura, marcaDeReversion, motivoDeLaBaja } from './estado-de-reversion';

const normal = {
  anuladoEn: null,
  revertidoEn: null,
  revierteAId: null,
  motivoDeAnulacion: null,
  motivoDeReversion: null,
};

describe('marcaDeReversion', () => {
  it('un movimiento normal no lleva marca', () => {
    expect(marcaDeReversion(normal)).toBeUndefined();
  });

  it('el original con su inverso es «Revertido» y el inverso, «Reversión»', () => {
    expect(marcaDeReversion({ ...normal, revertidoEn: '2026-02-01T00:00:00Z' })).toBe('Revertido');
    expect(marcaDeReversion({ ...normal, revierteAId: 'original' })).toBe('Reversión');
  });

  it('un cheque anulado a la antigua es «Anulado»', () => {
    expect(marcaDeReversion({ ...normal, anuladoEn: '2026-02-01T00:00:00Z' })).toBe('Anulado');
  });
});

describe('esDeSoloLectura', () => {
  it('solo lo normal se puede seguir corrigiendo', () => {
    expect(esDeSoloLectura(normal)).toBe(false);
    expect(esDeSoloLectura({ ...normal, revertidoEn: '2026-02-01T00:00:00Z' })).toBe(true);
    expect(esDeSoloLectura({ ...normal, revierteAId: 'original' })).toBe(true);
    expect(esDeSoloLectura({ ...normal, anuladoEn: '2026-02-01T00:00:00Z' })).toBe(true);
  });
});

describe('motivoDeLaBaja', () => {
  it('toma el motivo de la anulación o el de la reversión, según la baja que tuvo', () => {
    expect(motivoDeLaBaja({ ...normal, anuladoEn: 'x', motivoDeAnulacion: 'Se perdió' })).toEqual({
      etiqueta: 'Motivo de anulación',
      valor: 'Se perdió',
    });
    expect(motivoDeLaBaja({ ...normal, revertidoEn: 'x', motivoDeReversion: 'Duplicada' })).toEqual({
      etiqueta: 'Motivo de anulación',
      valor: 'Duplicada',
    });
  });

  it('sin baja, no hay renglón', () => {
    expect(motivoDeLaBaja(normal)).toBeNull();
  });
});
