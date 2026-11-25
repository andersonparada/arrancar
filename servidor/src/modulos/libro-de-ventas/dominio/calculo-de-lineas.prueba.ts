import { describe, expect, it } from 'vitest';
import { calcularLineas, type LineaEscrita } from './calculo-de-lineas.js';
import { CorreccionDeIvaExcedida, LineaInvalida } from './errores-de-documento.js';
import { ivaDelDocumento, repartirIva } from './reparto-de-iva.js';
import { totalesDelDocumento } from './totales-del-documento.js';

const TASA = 1200;
const CONCEPTO = '22222222-2222-4222-8222-222222222222';

const linea = (cambios: Partial<LineaEscrita> = {}): LineaEscrita => ({
  conceptoDeIngresoId: CONCEPTO,
  tipo: 'bien',
  claseFiscal: 'gravada',
  descripcion: null,
  total: 11200,
  otrosImpuestos: 0,
  ...cambios,
});

describe('IVA de una línea gravada', () => {
  it('saca el 12 % de adentro: Q112.00 son Q100.00 más Q12.00', () => {
    const [calculada] = calcularLineas([linea()], { cobraIva: true, tasaDeIva: TASA });

    expect(calculada).toMatchObject({ orden: 1, base: 10000, iva: 1200 });
  });

  it('los otros impuestos no llevan IVA ni forman la base', () => {
    const [calculada] = calcularLineas([linea({ total: 12200, otrosImpuestos: 1000 })], {
      cobraIva: true,
      tasaDeIva: TASA,
    });

    expect(calculada).toMatchObject({ base: 10000, iva: 1200, otrosImpuestos: 1000 });
  });

  it('el IVA del documento se reparte entre las gravadas con la suma exacta', () => {
    const lineas = [linea({ total: 3333 }), linea({ total: 3333 }), linea({ total: 3334 })];

    const calculadas = calcularLineas(lineas, { cobraIva: true, tasaDeIva: TASA });

    expect(calculadas.reduce((suma, l) => suma + l.iva, 0)).toBe(ivaDelDocumento(10000, TASA));
    expect(calculadas.every((l) => l.total === l.base + l.iva + l.otrosImpuestos)).toBe(true);
  });
});

describe('líneas sin IVA', () => {
  it('exenta, exportación y no afecta llevan todo a la base', () => {
    const clases = ['exenta', 'exportacion', 'no_afecta'] as const;

    const calculadas = calcularLineas(
      clases.map((claseFiscal) => linea({ claseFiscal })),
      { cobraIva: true, tasaDeIva: TASA },
    );

    expect(calculadas.map((l) => [l.base, l.iva])).toEqual([
      [11200, 0],
      [11200, 0],
      [11200, 0],
    ]);
  });

  it('fuera del régimen general, la gravada tampoco lleva IVA', () => {
    const [calculada] = calcularLineas([linea()], { cobraIva: false, tasaDeIva: TASA });

    expect(calculada).toMatchObject({ base: 11200, iva: 0 });
  });

  it('una mezcla reparte el IVA solo entre las gravadas', () => {
    const calculadas = calcularLineas([linea(), linea({ claseFiscal: 'exenta' })], { cobraIva: true, tasaDeIva: TASA });

    expect(calculadas.map((l) => l.iva)).toEqual([1200, 0]);
  });
});

describe('IVA del DTE', () => {
  it('se acepta si se aparta hasta Q0.05 y la diferencia va a la línea mayor', () => {
    const [calculada] = calcularLineas([linea()], { cobraIva: true, tasaDeIva: TASA, ivaDelDte: 1203 });

    expect(calculada).toMatchObject({ iva: 1203, base: 9997 });
  });

  it('se rechaza si se aparta más de la tolerancia', () => {
    const intento = () => calcularLineas([linea()], { cobraIva: true, tasaDeIva: TASA, ivaDelDte: 1300 });

    expect(intento).toThrow(CorreccionDeIvaExcedida);
  });

  it('con muchas líneas la tolerancia crece a un centavo por línea', () => {
    const gravados = Array.from({ length: 8 }, () => 1000);

    expect(() => repartirIva(gravados, TASA, ivaDelDocumento(8000, TASA) + 8)).not.toThrow();
    expect(() => repartirIva(gravados, TASA, ivaDelDocumento(8000, TASA) + 9)).toThrow(CorreccionDeIvaExcedida);
  });

  it('un DTE con IVA sin líneas gravadas o fuera del régimen general es error', () => {
    const exenta = () =>
      calcularLineas([linea({ claseFiscal: 'exenta' })], { cobraIva: true, tasaDeIva: TASA, ivaDelDte: 100 });
    const sinDebito = () => calcularLineas([linea()], { cobraIva: false, tasaDeIva: TASA, ivaDelDte: 100 });

    expect(exenta).toThrow(LineaInvalida);
    expect(sinDebito).toThrow(LineaInvalida);
  });
});

describe('líneas inválidas', () => {
  it('sin líneas, con total cero o con otros impuestos de más', () => {
    const opciones = { cobraIva: true, tasaDeIva: TASA };

    expect(() => calcularLineas([], opciones)).toThrow(LineaInvalida);
    expect(() => calcularLineas([linea({ total: 0 })], opciones)).toThrow(LineaInvalida);
    expect(() => calcularLineas([linea({ total: 500, otrosImpuestos: 600 })], opciones)).toThrow(LineaInvalida);
    expect(() => calcularLineas([linea({ total: 10.5 })], opciones)).toThrow(LineaInvalida);
  });
});

describe('totales del documento por columna del libro', () => {
  it('separa gravado de bienes y de servicios, exento, exportación, IVA y otros', () => {
    const calculadas = calcularLineas(
      [
        linea({ total: 11200 }),
        linea({ total: 5600, tipo: 'servicio' }),
        linea({ total: 1000, claseFiscal: 'exenta' }),
        linea({ total: 2000, claseFiscal: 'no_afecta' }),
        linea({ total: 3000, claseFiscal: 'exportacion', tipo: 'servicio' }),
        linea({ total: 1100, otrosImpuestos: 100, claseFiscal: 'exenta' }),
      ],
      { cobraIva: true, tasaDeIva: TASA },
    );

    const totales = totalesDelDocumento(calculadas);

    expect(totales).toEqual({
      total: 11200 + 5600 + 1000 + 2000 + 3000 + 1100,
      gravadoBienes: 10000,
      gravadoServicios: 5000,
      exento: 1000 + 2000 + 1000,
      exportacion: 3000,
      iva: 1800,
      otrosImpuestos: 100,
    });
  });
});
