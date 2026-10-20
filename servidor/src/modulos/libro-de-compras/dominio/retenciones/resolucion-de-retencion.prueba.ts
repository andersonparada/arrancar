import { describe, expect, it } from 'vitest';
import {
  NotaDeResolucionInvalida,
  ResolucionInvalida,
  ResolucionSoloDeDocumentoAnulado,
  RetencionEnCero,
} from './errores-de-retenciones.js';
import {
  accionSugerida,
  exigirResolvible,
  notaDeResolucionValida,
  RESOLUCIONES,
  resolucionValida,
} from './resolucion-de-retencion.js';

describe('resolución de una retención por resolver', () => {
  it('acepta las cuatro resoluciones y rechaza otra', () => {
    for (const resolucion of RESOLUCIONES) expect(resolucionValida(resolucion)).toBe(resolucion);
    expect(() => resolucionValida('olvidada')).toThrow(ResolucionInvalida);
  });

  it('resolver exige una nota de 1 a 300 caracteres; volver a pendiente no guarda nota', () => {
    expect(notaDeResolucionValida('rectificada', '  Se rectificó el entero  ')).toBe('Se rectificó el entero');
    expect(() => notaDeResolucionValida('no_requiere', '  ')).toThrow(NotaDeResolucionInvalida);
    expect(() => notaDeResolucionValida('constancia_anulada', 'x'.repeat(301))).toThrow(NotaDeResolucionInvalida);
    expect(notaDeResolucionValida('pendiente', 'ignorada')).toBeNull();
  });

  it('solo se resuelve lo practicado de un documento anulado', () => {
    expect(() => exigirResolvible({ documentoAnulado: true, monto: 500 })).not.toThrow();
    expect(() => exigirResolvible({ documentoAnulado: true, monto: 0 })).toThrow(RetencionEnCero);
    expect(() => exigirResolvible({ documentoAnulado: false, monto: 500 })).toThrow(ResolucionSoloDeDocumentoAnulado);
  });

  it('sugiere la acción según haya constancia o entero', () => {
    expect(accionSugerida({ conConstancia: true, enterada: false })).toBe('anular_constancia');
    expect(accionSugerida({ conConstancia: false, enterada: true })).toBe('rectificar_entero');
    expect(accionSugerida({ conConstancia: true, enterada: true })).toBe('anular_constancia_y_rectificar');
    expect(accionSugerida({ conConstancia: false, enterada: false })).toBe('confirmar');
  });
});
