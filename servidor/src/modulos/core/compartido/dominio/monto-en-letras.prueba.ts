import { describe, expect, it } from 'vitest';
import { montoEnLetras } from './monto-en-letras.js';

describe('montoEnLetras', () => {
  it.each([
    [0, 'Cero quetzales con 00/100'],
    [100, 'Un quetzal con 00/100'],
    [112000, 'Mil ciento veinte quetzales con 00/100'],
    [2150, 'Veintiún quetzales con 50/100'],
    [10000, 'Cien quetzales con 00/100'],
    [10100, 'Ciento un quetzales con 00/100'],
    [3105, 'Treinta y un quetzales con 05/100'],
    [210000, 'Dos mil cien quetzales con 00/100'],
    [2100000, 'Veintiún mil quetzales con 00/100'],
    [100000000, 'Un millón de quetzales con 00/100'],
    [250000099, 'Dos millones quinientos mil quetzales con 99/100'],
    [4100000000, 'Cuarenta y un millones de quetzales con 00/100'],
    [123456789, 'Un millón doscientos treinta y cuatro mil quinientos sesenta y siete quetzales con 89/100'],
  ])('%i centavos se leen «%s»', (centavos, texto) => {
    expect(montoEnLetras(centavos)).toBe(texto);
  });
});
