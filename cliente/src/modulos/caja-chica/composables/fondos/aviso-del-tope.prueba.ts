import { describe, expect, it } from 'vitest';
import { AVISO_DEL_TOPE, avisoDelTope } from './aviso-del-tope';

describe('el aviso del tope', () => {
  it('avisa si el tope pasa del monto del fondo', () => {
    expect(avisoDelTope('1500', '1000')).toBe(AVISO_DEL_TOPE);
    expect(avisoDelTope(1000.01, '1000.00')).toBe(AVISO_DEL_TOPE);
  });

  it('no avisa si cabe, es igual, o falta alguno', () => {
    expect(avisoDelTope('1000', '1000')).toBeNull();
    expect(avisoDelTope('200', '1000')).toBeNull();
    expect(avisoDelTope('', '1000')).toBeNull();
    expect(avisoDelTope(null, '1000')).toBeNull();
    expect(avisoDelTope('500', '')).toBeNull();
  });
});
