import { describe, expect, it } from 'vitest';
import { numeroONulo, numeroRequerido, opcionesDeLista, textoDeEdicion, textoONulo } from './edicion';

describe('conversiones del formulario', () => {
  it('lo que falta se muestra vacío y lo vacío se manda como null', () => {
    expect(textoDeEdicion(null)).toBe('');
    expect(textoDeEdicion(7)).toBe('7');
    expect(textoONulo('   ')).toBeNull();
    expect(textoONulo(' Luna ')).toBe('Luna');
  });

  it('los números aceptan lo que devuelve un campo de número', () => {
    expect(numeroONulo('')).toBeNull();
    expect(numeroONulo('12')).toBe(12);
    expect(numeroONulo(12)).toBe(12);
    expect(numeroRequerido('')).toBeNaN();
  });

  it('una lista opcional deja no elegir', () => {
    const opciones = { macho: 'Macho', hembra: 'Hembra' };

    expect(opcionesDeLista(opciones, false).map((o) => o.valor)).toEqual(['macho', 'hembra']);
    expect(opcionesDeLista(opciones, true)[0]).toEqual({ valor: null, texto: 'Sin elegir' });
  });
});
