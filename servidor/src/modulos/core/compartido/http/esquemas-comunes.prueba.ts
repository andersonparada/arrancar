import { describe, expect, it } from 'vitest';
import {
  decimalObligatorio,
  decimalOpcional,
  enteroOpcional,
  fechaObligatoria,
  fechaOpcional,
  opcionOpcional,
} from './esquemas-comunes.js';

describe('esquemas comunes', () => {
  it('un decimal viaja como texto, acepta un número y respeta sus decimales', () => {
    expect(decimalObligatorio(2).parse(1250.5)).toBe('1250.5');
    expect(decimalObligatorio(2).parse(' 12.25 ')).toBe('12.25');
    expect(decimalObligatorio(2).safeParse('12.255').success).toBe(false);
    expect(decimalObligatorio(2).safeParse('doce').success).toBe(false);
    expect(decimalObligatorio(2).safeParse('999999999999.99').success).toBe(true);
    expect(decimalObligatorio(2).safeParse('1000000000000.00').success).toBe(false);
  });

  it('lo opcional que llega vacío queda como null', () => {
    expect(decimalOpcional(2).parse('')).toBeNull();
    expect(decimalOpcional(2).parse(undefined)).toBeNull();
    expect(enteroOpcional().parse(null)).toBeNull();
    expect(fechaOpcional().parse('')).toBeNull();
    expect(opcionOpcional(['macho', 'hembra']).parse(undefined)).toBeNull();
  });

  it('la fecha va sin hora, como aaaa-mm-dd', () => {
    expect(fechaObligatoria().parse('2026-09-27')).toBe('2026-09-27');
    expect(fechaObligatoria().safeParse('27/09/2026').success).toBe(false);
  });

  it('una opción fuera de la lista no pasa', () => {
    expect(opcionOpcional(['macho', 'hembra']).safeParse('otro').success).toBe(false);
  });
});
