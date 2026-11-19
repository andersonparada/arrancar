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

/** Los montos que el cheque imprime (docs/modulos/diseno-impresion-de-cheques.md §12, IC-3), en mayúsculas y con tilde. */
describe('montoEnLetras en un cheque (mayúsculas con tilde)', () => {
  const enMayusculas = (centavos: number) => montoEnLetras(centavos).toLocaleUpperCase('es-GT');

  it.each([
    [1, 'CERO QUETZALES CON 01/100'],
    [100, 'UN QUETZAL CON 00/100'],
    [1500, 'QUINCE QUETZALES CON 00/100'],
    [1600, 'DIECISÉIS QUETZALES CON 00/100'],
    [2100, 'VEINTIÚN QUETZALES CON 00/100'],
    [10000, 'CIEN QUETZALES CON 00/100'],
    [10100, 'CIENTO UN QUETZALES CON 00/100'],
    [100000, 'MIL QUETZALES CON 00/100'],
    [100199, 'MIL UN QUETZALES CON 99/100'],
    [2100000, 'VEINTIÚN MIL QUETZALES CON 00/100'],
    [100000000, 'UN MILLÓN DE QUETZALES CON 00/100'],
    [100000100, 'UN MILLÓN UN QUETZALES CON 00/100'],
    [150000000, 'UN MILLÓN QUINIENTOS MIL QUETZALES CON 00/100'],
    [200000000, 'DOS MILLONES DE QUETZALES CON 00/100'],
  ])('%i centavos se leen «%s»', (centavos, texto) => {
    expect(enMayusculas(centavos)).toBe(texto);
  });

  it('llega al máximo de numeric(14,2) sin perder cifras', () => {
    const maximo = 99_999_999_999_999;

    expect(enMayusculas(maximo)).toBe(
      'NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE MILLONES ' +
        'NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE QUETZALES CON 99/100',
    );
  });
});
