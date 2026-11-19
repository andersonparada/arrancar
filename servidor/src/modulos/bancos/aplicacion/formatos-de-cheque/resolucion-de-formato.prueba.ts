import { describe, expect, it } from 'vitest';
import { FormatoDeChequeDañado, FormatoDeChequeInvalido } from '../../dominio/errores-de-impresion.js';
import { CLAVES_DE_PLANTILLA, plantillaDeFabrica } from '../../dominio/formatos-de-cheque/plantillas.js';
import { esquemaDeFormatoDeCheque } from './esquema-de-formato.js';
import { formatoDeFabrica, resolverFormato, resolverFormatoGuardado } from './resolucion-de-formato.js';

describe('las plantillas de fábrica', () => {
  it.each(CLAVES_DE_PLANTILLA)('«%s» cumple el esquema estricto', (clave) => {
    expect(esquemaDeFormatoDeCheque.safeParse(plantillaDeFabrica(clave).formato).success).toBe(true);
  });

  it('son cuatro, con nombre genérico y la advertencia de medidas aproximadas', () => {
    expect(CLAVES_DE_PLANTILLA).toHaveLength(4);
    for (const clave of CLAVES_DE_PLANTILLA) {
      expect(plantillaDeFabrica(clave).descripcion).toContain('Medidas aproximadas');
    }
  });
});

describe('resolver el formato', () => {
  it('sin ajustes es la plantilla', () => {
    expect(resolverFormato('cheque_suelto', {})).toEqual(formatoDeFabrica('cheque_suelto'));
  });

  it('los ajustes cambian solo lo que dicen', () => {
    const formato = resolverFormato('cheque_suelto', {
      desplazamiento: { xMm: 1.5, yMm: -2 },
      beneficiario: { xMm: 30 },
      noNegociable: { preimpreso: true },
    });

    expect(formato.desplazamiento).toEqual({ xMm: 1.5, yMm: -2 });
    expect(formato.beneficiario).toMatchObject({ xMm: 30, yMm: 24, anchoMm: 105, visible: true });
    expect(formato.noNegociable.preimpreso).toBe(true);
    expect(formato.montoEnNumeros).toEqual(formatoDeFabrica('cheque_suelto').montoEnNumeros);
  });

  it('cambiar el modo de la fecha reemplaza la forma entera', () => {
    const formato = resolverFormato('cheque_suelto', {
      fecha: {
        modo: 'casillas',
        lugar: null,
        dia: { xMm: 100, yMm: 10, anchoMm: 8, visible: true },
        mes: { xMm: 112, yMm: 10, anchoMm: 8, visible: true },
        anio: { xMm: 124, yMm: 10, anchoMm: 14, visible: true },
      },
    });

    expect(formato.fecha.modo).toBe('casillas');
  });

  it('el segundo renglón de las letras se puede quitar', () => {
    const formato = resolverFormato('cheque_suelto', { montoEnLetras: { segundaLinea: null } });

    expect(formato.montoEnLetras.segundaLinea).toBeNull();
  });
});

describe('ajustes inválidos', () => {
  it.each([
    ['una medida fuera de rango', { desplazamiento: { xMm: 50 } }],
    ['una letra que no es monoespaciada', { letra: { familia: 'sans' } }],
    ['un tamaño de letra fuera de 6 a 16', { letra: { tamanoPt: 30 } }],
    [
      'un campo libre que no existe (anotación en el cheque)',
      { anotacion: { xMm: 1, yMm: 1, anchoMm: 30, visible: true } },
    ],
    ['un dato extra dentro de un campo', { beneficiario: { texto: 'Páguese a partir de' } }],
    ['un papel demasiado chico', { papel: { anchoMm: 10 } }],
    ['una fecha en casillas sin las casillas', { fecha: { modo: 'casillas' } }],
  ])('rechaza %s', (_titulo, ajustes) => {
    expect(() => resolverFormato('cheque_suelto', ajustes)).toThrow(FormatoDeChequeInvalido);
  });

  it('rechaza ajustes que no son un objeto', () => {
    expect(() => resolverFormato('cheque_suelto', [])).toThrow(FormatoDeChequeInvalido);
    expect(() => resolverFormato('cheque_suelto', null)).toThrow(FormatoDeChequeInvalido);
  });

  it('un formato guardado con ajustes que dejaron de ser válidos no imprime: está dañado', () => {
    const guardado = { nombre: 'Banrural', base: 'cheque_suelto' as const, ajustes: { letra: { tamanoPt: 99 } } };

    expect(() => resolverFormatoGuardado(guardado)).toThrow(FormatoDeChequeDañado);
  });
});
