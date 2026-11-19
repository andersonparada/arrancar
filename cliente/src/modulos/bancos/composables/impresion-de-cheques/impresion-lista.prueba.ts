import { describe, expect, it } from 'vitest';
import type { VistaDeImpresion } from '../../servicios/tipos-de-impresion-de-cheques';
import { dejarImpresionLista, tomarImpresionLista } from './impresion-lista';

const vistaDe = (...ids: string[]): VistaDeImpresion => ({
  cheques: ids.map((chequeId) => ({ chequeId }) as VistaDeImpresion['cheques'][number]),
  avisos: [],
  loteId: null,
});

describe('impresión ya registrada que espera en la pantalla', () => {
  it('se entrega una sola vez', () => {
    dejarImpresionLista(vistaDe('a'));
    expect(tomarImpresionLista(['a'])?.cheques[0]?.chequeId).toBe('a');
    expect(tomarImpresionLista(['a'])).toBeNull();
  });

  it('si es de otros cheques, no se entrega y se descarta', () => {
    dejarImpresionLista(vistaDe('a'));
    expect(tomarImpresionLista(['b'])).toBeNull();
    expect(tomarImpresionLista(['a'])).toBeNull();
  });

  it('sin nada esperando, no hay nada', () => {
    expect(tomarImpresionLista(['a'])).toBeNull();
  });
});
