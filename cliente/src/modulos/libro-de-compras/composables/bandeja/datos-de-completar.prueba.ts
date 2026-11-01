import { describe, expect, it } from 'vitest';
import { filaDte, propuesta } from './bandeja.soporte';
import {
  algunaPideLaRecepcion,
  cambiosDeCompletar,
  edicionDeCompletarVacia,
  hayAlgoQueCompletar,
  notaPorCompletar,
  peticionDeCompletar,
} from './datos-de-completar';

describe('completar filas de la bandeja', () => {
  it('sin escoger nada no hay cambios ni nada que guardar', () => {
    const edicion = edicionDeCompletarVacia();
    expect(cambiosDeCompletar(edicion)).toEqual({});
    expect(hayAlgoQueCompletar(edicion)).toBe(false);
  });

  it('manda solo lo escogido', () => {
    const edicion = { ...edicionDeCompletarVacia(), conceptoId: 'c1', destino: 'caja-chica' as const };
    expect(peticionDeCompletar(['a', 'b'], edicion)).toEqual({
      ids: ['a', 'b'],
      cambios: { conceptoId: 'c1', destino: 'caja-chica' },
      aplicarPropuestas: [],
    });
  });

  it('«Usar la fecha de emisión» aplica la propuesta y descarta la fecha escrita', () => {
    const edicion = { ...edicionDeCompletarVacia(), fechaRecepcion: '2026-10-20', usarFechaDeEmision: true };
    expect(cambiosDeCompletar(edicion)).toEqual({});
    expect(peticionDeCompletar(['a'], edicion).aplicarPropuestas).toEqual(['fechaRecepcion']);
    expect(hayAlgoQueCompletar(edicion)).toBe(true);
  });

  it('la fecha escrita viaja sola cuando no se usa la de emisión', () => {
    const edicion = { ...edicionDeCompletarVacia(), fechaRecepcion: '2026-10-20' };
    expect(cambiosDeCompletar(edicion)).toEqual({ fechaRecepcion: '2026-10-20' });
  });

  it('la factura que corrige solo se escoge con una nota marcada', () => {
    const nota = filaDte({ tipoDte: 'NCRE' });
    expect(notaPorCompletar([nota])).toBe(nota);
    expect(notaPorCompletar([nota, filaDte({ id: 'f2', tipoDte: 'NDEB' })])).toBeNull();
    expect(notaPorCompletar([filaDte()])).toBeNull();
    expect(notaPorCompletar([])).toBeNull();
  });

  it('avisa si alguna fila es de un agente de retención sin recepción propuesta', () => {
    const agente = filaDte({ propuesta: propuesta({ recepcionObligatoria: true }) });
    expect(algunaPideLaRecepcion([filaDte(), agente])).toBe(true);
    expect(algunaPideLaRecepcion([filaDte()])).toBe(false);
  });
});
