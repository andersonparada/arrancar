import { describe, expect, it } from 'vitest';
import {
  calcularIdp,
  calcularLineas,
  costoDeLinea,
  type CombustibleDeLinea,
  type LineaCalculada,
  type OpcionesDeCalculo,
} from './calculo-de-linea.js';
import { LineaInvalida } from './errores-de-calculo.js';
import { ivaDelDocumento } from './reparto-de-iva.js';
import { totalesDelDocumento } from './totales-del-documento.js';

const combustible = (cambios: Partial<CombustibleDeLinea> = {}): CombustibleDeLinea => ({
  galones: '100',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '10',
  ...cambios,
});

const conIva: OpcionesDeCalculo = { cobraIva: true, tasaDeIva: 1200, ivaNoAcreditable: false };

const cuadra = (linea: LineaCalculada) => linea.base + linea.iva + linea.idp + linea.exento;

describe('calcularIdp: round(galones × idp × (100 − etanol) / 100, 2)', () => {
  it.each([
    ['100', '4.70', '10', 42300],
    ['1', '4.70', '0', 470],
    ['1.5', '4.70', '10', 635],
    ['0.001', '4.70', '0', 0],
    ['10', '4.70', '100', 0],
    ['33.333', '4.70', '10.50', 14022],
    ['10', '0', '10', 0],
  ])('%s galones a %s con %s %% de etanol dan %i centavos', (...caso) => {
    const [galones, idpPorGalon, porcentajeDeEtanol, esperado] = caso;
    expect(calcularIdp(combustible({ galones, idpPorGalon, porcentajeDeEtanol }))).toBe(esperado);
  });

  it.each([
    ['galones', { galones: '0' }],
    ['galones negativos', { galones: '-1' }],
    ['galones con 4 decimales', { galones: '1.0001' }],
    ['tasa con texto', { idpPorGalon: 'abc' }],
    ['tasa con 3 decimales', { idpPorGalon: '4.701' }],
    ['etanol mayor a 100', { porcentajeDeEtanol: '100.01' }],
  ])('rechaza %s', (_caso, cambios) => {
    expect(() => calcularIdp(combustible(cambios))).toThrow(LineaInvalida);
  });
});

describe('calcularLineas', () => {
  it('saca la base y el IVA de una línea gravada', () => {
    const [linea] = calcularLineas([{ total: 11200, exento: 0 }], conIva);
    expect(linea).toEqual({ total: 11200, exento: 0, idp: 0, base: 10000, iva: 1200, ivaNoAcreditable: 0 });
  });

  it('separa el IDP, el exento y el gravado', () => {
    const [linea] = calcularLineas([{ total: 100000, exento: 0, combustible: combustible() }], conIva);
    expect(linea).toEqual({ total: 100000, exento: 0, idp: 42300, base: 51518, iva: 6182, ivaNoAcreditable: 0 });
    const [conExento] = calcularLineas([{ total: 16200, exento: 5000 }], conIva);
    expect(conExento).toMatchObject({ exento: 5000, base: 10000, iva: 1200 });
  });

  it('sin IVA (pequeño contribuyente o casilla SAT desmarcada) todo el gravado va a la base', () => {
    const [linea] = calcularLineas(
      [{ total: 11200, exento: 1000, combustible: combustible({ galones: '1', porcentajeDeEtanol: '0' }) }],
      {
        ...conIva,
        cobraIva: false,
      },
    );
    expect(linea).toMatchObject({ idp: 470, iva: 0, base: 11200 - 470 - 1000 });
  });

  it('con IVA no acreditable el IVA de cada línea va a su costo', () => {
    const lineas = calcularLineas(
      [
        { total: 11200, exento: 0 },
        { total: 5600, exento: 0 },
      ],
      { ...conIva, ivaNoAcreditable: true },
    );
    expect(lineas.map((linea) => linea.ivaNoAcreditable)).toEqual(lineas.map((linea) => linea.iva));
    expect(lineas.map(costoDeLinea)).toEqual([11200, 5600]);
  });

  it('el IVA del documento es el del total, no la suma de redondear línea por línea', () => {
    const escritas = [1, 2, 3].map(() => ({ total: 1000, exento: 0 }));
    const lineas = calcularLineas(escritas, conIva);
    expect(lineas.reduce((suma, linea) => suma + linea.iva, 0)).toBe(ivaDelDocumento(3000, 1200));
    expect(lineas.every((linea) => cuadra(linea) === linea.total)).toBe(true);
  });

  it('una línea 100 % IDP o 100 % exenta queda sin base', () => {
    const [soloIdp] = calcularLineas([{ total: 42300, exento: 0, combustible: combustible() }], conIva);
    expect(soloIdp).toMatchObject({ idp: 42300, base: 0, iva: 0 });
    const [exenta] = calcularLineas([{ total: 5000, exento: 5000 }], conIva);
    expect(exenta).toMatchObject({ base: 0, iva: 0 });
  });

  it('aplica el IVA de la FEL con la corrección de centavos', () => {
    const lineas = calcularLineas([{ total: 11203, exento: 0 }], { ...conIva, ivaDeLaFel: 1203 });
    expect(lineas[0]).toMatchObject({ iva: 1203, base: 10000 });
  });

  it('cada línea cuadra con total = base + iva + idp + exento (casos mezclados)', () => {
    const lineas = calcularLineas(
      [
        { total: 123457, exento: 1000, combustible: combustible({ galones: '12.345', porcentajeDeEtanol: '5.5' }) },
        { total: 99, exento: 0 },
        { total: 1, exento: 0 },
        { total: 777777, exento: 7777 },
      ],
      conIva,
    );
    for (const linea of lineas) {
      expect(cuadra(linea)).toBe(linea.total);
      expect(linea.base).toBeGreaterThanOrEqual(0);
      expect(linea.iva).toBeLessThanOrEqual(linea.total);
    }
  });

  it.each([
    ['sin líneas', []],
    ['total cero', [{ total: 0, exento: 0 }]],
    ['total con fracción', [{ total: 10.5, exento: 0 }]],
    ['total negativo', [{ total: -100, exento: 0 }]],
    ['exento negativo', [{ total: 100, exento: -1 }]],
    ['IDP mayor al total', [{ total: 1000, exento: 0, combustible: combustible() }]],
    ['exento mayor al total', [{ total: 1000, exento: 1001 }]],
  ])('rechaza %s', (_caso, lineas) => {
    expect(() => calcularLineas(lineas, conIva)).toThrow(LineaInvalida);
  });
});

describe('totalesDelDocumento', () => {
  it('suma las líneas y cuadra con el total', () => {
    const lineas = calcularLineas(
      [
        { total: 100000, exento: 0, combustible: combustible() },
        { total: 16200, exento: 5000 },
      ],
      conIva,
    );
    const totales = totalesDelDocumento(lineas);
    expect(totales.total).toBe(116200);
    expect(totales.idp).toBe(42300);
    expect(totales.exento).toBe(5000);
    expect(totales.base + totales.iva + totales.idp + totales.exento).toBe(totales.total);
  });

  it('sin líneas todo es cero', () => {
    expect(totalesDelDocumento([])).toEqual({ total: 0, base: 0, iva: 0, ivaNoAcreditable: 0, idp: 0, exento: 0 });
  });
});
