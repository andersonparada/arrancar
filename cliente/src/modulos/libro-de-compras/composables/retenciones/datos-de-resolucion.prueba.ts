import { describe, expect, it } from 'vitest';
import {
  cuerpoDeResolucion,
  resolucionInicial,
  notaParaEnviar,
  opcionesDeResolucion,
  pideNota,
  resolucionSugerida,
  revisarResolucion,
} from './datos-de-resolucion';
import { ACCIONES_SUGERIDAS } from '../../textos-de-retenciones';

describe('resolver una retención', () => {
  it('las opciones van en orden de nombre y traen las cuatro', () => {
    const textos = opcionesDeResolucion().map((o) => o.texto);
    expect(textos).toHaveLength(4);
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('deja escogida la resolución cuando solo hay una cosa por hacer', () => {
    expect(resolucionSugerida('anular_constancia')).toBe('constancia_anulada');
    expect(resolucionSugerida('rectificar_entero')).toBe('rectificada');
    expect(resolucionSugerida('confirmar')).toBe('no_requiere');
    expect(resolucionSugerida('anular_constancia_y_rectificar')).toBe('');
  });

  it('explica cada acción sugerida en palabras llanas', () => {
    expect(ACCIONES_SUGERIDAS.anular_constancia.titulo).toBe('Anule la constancia en Retenciones Web de la SAT.');
    expect(Object.keys(ACCIONES_SUGERIDAS)).toHaveLength(4);
  });

  it('pide la nota salvo al volver a pendiente', () => {
    expect(pideNota('rectificada')).toBe(true);
    expect(pideNota('pendiente')).toBe(false);
    expect(pideNota('')).toBe(false);
  });

  it('revisa que haya resolución y nota', () => {
    expect(revisarResolucion('', '')).toHaveProperty('resolucion');
    expect(revisarResolucion('rectificada', '  ')).toHaveProperty('nota');
    expect(revisarResolucion('rectificada', 'Rectificado el 20/10')).toEqual({});
    expect(revisarResolucion('pendiente', '')).toEqual({});
    expect(revisarResolucion('no_requiere', 'x'.repeat(301))).toHaveProperty('nota');
  });

  it('al volver a pendiente no se manda nota', () => {
    expect(notaParaEnviar('pendiente', 'algo')).toBeNull();
    expect(notaParaEnviar('no_requiere', ' listo ')).toBe('listo');
  });

  it('al abrir deja la sugerencia solo si la retención sigue pendiente', () => {
    expect(resolucionInicial({ resolucion: 'pendiente', accionSugerida: 'confirmar' })).toBe('no_requiere');
    expect(resolucionInicial({ resolucion: 'rectificada', accionSugerida: 'confirmar' })).toBe('');
  });

  it('arma lo que se manda: la resolución y la nota limpia', () => {
    expect(cuerpoDeResolucion('rectificada', ' hecho ')).toEqual({ resolucion: 'rectificada', nota: 'hecho' });
    expect(cuerpoDeResolucion('pendiente', 'x')).toEqual({ resolucion: 'pendiente', nota: null });
  });
});
