import { describe, expect, it } from 'vitest';
import { calcularDocumento, type DatosParaCalcular } from './calculo-de-documento.js';
import { calcularLineas, costoDeLinea, type OpcionesDeCalculo } from './calculo-de-linea.js';
import { FacturaEspecialSinOtrosImpuestos } from './errores-de-factura-especial.js';
import { LineaInvalida } from './errores-de-calculo.js';
import { totalesDelDocumento } from './totales-del-documento.js';

const conIva: OpcionesDeCalculo = { cobraIva: true, tasaDeIva: 1200, ivaNoAcreditable: false };
const sinIva: OpcionesDeCalculo = { cobraIva: false, tasaDeIva: 1200, ivaNoAcreditable: false };

const documento = (lineas: DatosParaCalcular['lineas']): DatosParaCalcular => ({
  tipo: 'factura',
  muestraEnReportesSat: true,
  noVinculado: false,
  empresaConCreditoFiscal: true,
  empresaConIsrSobreUtilidades: true,
  fechaDeEmision: '2026-01-15',
  fechaDeRecepcion: '2026-01-20',
  periodo: '2026-01-01',
  lineas,
  tasaDeIva: 1200,
  mesActual: '2026-01-01',
});

describe('otros impuestos de la línea', () => {
  it('se restan del gravado, cuadran y entran al costo (factura de luz con tasa municipal)', () => {
    const [linea] = calcularLineas([{ total: 12700, exento: 0, otrosImpuestos: 1500 }], conIva);
    expect(linea).toEqual({
      total: 12700,
      exento: 0,
      otrosImpuestos: 1500,
      idp: 0,
      idpEscrito: false,
      base: 10000,
      iva: 1200,
      ivaNoAcreditable: 0,
    });
    expect(costoDeLinea(linea!)).toBe(11500);
  });

  it('sin IVA todo lo que no son otros impuestos va a la base', () => {
    const [linea] = calcularLineas([{ total: 5000, exento: 0, otrosImpuestos: 500 }], sinIva);
    expect(linea).toMatchObject({ base: 4500, iva: 0, otrosImpuestos: 500 });
  });

  it('sin el dato valen cero', () => {
    const [linea] = calcularLineas([{ total: 11200, exento: 0 }], conIva);
    expect(linea?.otrosImpuestos).toBe(0);
  });

  it.each([
    ['negativos', 11200, -1],
    ['con fracción', 11200, 10.5],
    ['mayores al total', 1000, 1001],
  ])('rechaza otros impuestos %s', (_caso, total, otrosImpuestos) => {
    expect(() => calcularLineas([{ total, exento: 0, otrosImpuestos }], conIva)).toThrow(LineaInvalida);
  });

  it('los totales del documento los suman', () => {
    const lineas = calcularLineas(
      [
        { total: 12700, exento: 0, otrosImpuestos: 1500 },
        { total: 5000, exento: 0, otrosImpuestos: 300 },
      ],
      conIva,
    );
    const totales = totalesDelDocumento(lineas);
    expect(totales.otrosImpuestos).toBe(1800);
    expect(totales.total).toBe(totales.base + totales.iva + totales.idp + totales.exento + totales.otrosImpuestos);
  });
});

describe('motivo exento con otros impuestos', () => {
  it('todo exento más otros impuestos es exento', () => {
    const calculado = calcularDocumento(documento([{ total: 5500, exento: 5000, otrosImpuestos: 500 }]));
    expect(calculado.motivoSinCredito).toBe('exento');
  });

  it('solo otros impuestos no convierte la compra en exenta', () => {
    const calculado = calcularDocumento(documento([{ total: 500, exento: 0, otrosImpuestos: 500 }]));
    expect(calculado.motivoSinCredito).toBeNull();
    expect(calculado.totales).toMatchObject({ iva: 0, base: 0, otrosImpuestos: 500 });
  });

  it('con otra línea gravada tampoco es exenta', () => {
    const calculado = calcularDocumento(
      documento([
        { total: 5500, exento: 5000, otrosImpuestos: 500 },
        { total: 11200, exento: 0 },
      ]),
    );
    expect(calculado.motivoSinCredito).toBeNull();
  });
});

describe('IDP escrito', () => {
  const combustible = { galones: '100', idpPorGalon: '4.70', porcentajeDeEtanol: '10' };

  it('manda el escrito aunque no haya combustible ni galones', () => {
    const [linea] = calcularLineas([{ total: 100000, exento: 0, idp: 42300 }], conIva);
    expect(linea).toMatchObject({ idp: 42300, idpEscrito: true, base: 51518, iva: 6182 });
  });

  it('manda el escrito sobre el que saldría de los galones', () => {
    const [linea] = calcularLineas([{ total: 100000, exento: 0, idp: 40000, combustible }], conIva);
    expect(linea).toMatchObject({ idp: 40000, idpEscrito: true });
  });

  it('sin IDP escrito se calcula de los galones, como antes', () => {
    const [linea] = calcularLineas([{ total: 100000, exento: 0, idp: null, combustible }], conIva);
    expect(linea).toMatchObject({ idp: 42300, idpEscrito: false });
  });

  it.each([
    ['cero', 0],
    ['negativo', -5],
    ['mayor al total', 100001],
  ])('rechaza un IDP escrito %s', (_caso, idp) => {
    expect(() => calcularLineas([{ total: 100000, exento: 0, idp }], conIva)).toThrow(LineaInvalida);
  });
});

describe('factura especial sin otros impuestos ni IDP', () => {
  const especial = (lineas: DatosParaCalcular['lineas']) => ({
    ...documento(lineas),
    tipo: 'factura_especial' as const,
  });

  it('rechaza otros impuestos en una línea', () => {
    const calcular = () => calcularDocumento(especial([{ total: 11200, exento: 0, otrosImpuestos: 100 }]));
    expect(calcular).toThrow(FacturaEspecialSinOtrosImpuestos);
    expect(calcular).toThrow('Una factura especial no lleva otros impuestos ni IDP.');
  });

  it('rechaza un IDP escrito o de galones en una línea', () => {
    const combustible = { galones: '10', idpPorGalon: '4.70', porcentajeDeEtanol: '0' };
    expect(() => calcularDocumento(especial([{ total: 11200, exento: 0, idp: 500 }]))).toThrow(
      FacturaEspecialSinOtrosImpuestos,
    );
    expect(() => calcularDocumento(especial([{ total: 11200, exento: 0, combustible }]))).toThrow(
      FacturaEspecialSinOtrosImpuestos,
    );
  });

  it('sin ellos se calcula normal, y una factura común sí admite otros impuestos', () => {
    expect(calcularDocumento(especial([{ total: 11200, exento: 0 }])).totales.iva).toBe(1200);
    expect(
      calcularDocumento(documento([{ total: 11200, exento: 0, otrosImpuestos: 100 }])).totales.otrosImpuestos,
    ).toBe(100);
  });
});
