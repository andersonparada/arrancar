import { describe, expect, it } from 'vitest';
import { textoDeConciliado, textoDeMes } from './mes-de-conciliacion';

describe('mes de conciliación', () => {
  it('escribe el mes con dos dígitos', () => {
    expect(textoDeMes({ anio: 2026, mes: 3 })).toBe('03/2026');
    expect(textoDeMes(null)).toBeNull();
  });

  it('dice «Conciliado en mm/aaaa» o «Sin conciliar»', () => {
    expect(textoDeConciliado({ anio: 2026, mes: 11 })).toBe('Conciliado en 11/2026');
    expect(textoDeConciliado(null)).toBe('Sin conciliar');
  });
});
