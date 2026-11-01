import { describe, expect, it } from 'vitest';
import type { ArchivoDeFilas } from '../../../core/intercambio/aplicacion/puertos/lector-de-filas.js';
import { ArchivoDeLaSatNoReconocido } from '../../dominio/errores-de-bandeja.js';
import { interpretarEncabezadosAdicionales } from './encabezados-adicionales.js';
import { leerDteDeLaSat, type OpcionesDeLectura } from './lector-de-dte-sat.js';
import { construirMapa } from './mapa-de-encabezados-sat.js';
import { leerFechaDeLaSat, leerMonto } from './valores-de-la-sat.js';

const ENCABEZADOS = [
  'Fecha de emisión',
  'Número de Autorización',
  'Tipo de DTE (nombre)',
  'Serie',
  'Número del DTE',
  'NIT del emisor',
  'Nombre completo del emisor',
  'ID del receptor',
  'Estado',
  'Moneda',
  'Gran Total (Moneda Original)',
  'IVA (monto de este impuesto)',
  'Marca de anulado',
  'Fecha de anulación',
  'Petróleo (monto de este impuesto)',
  'Turismo Hospedaje (monto de este impuesto)',
  'Bomberos (monto de este impuesto)',
  'Columna nueva',
];

const UUID = (n: number) => `${String(n).padStart(8, '0')}-aaaa-4bbb-8ccc-dddddddddddd`;
const base = (cambios: Record<string, string> = {}): string[] => {
  const valores: Record<string, string> = {
    'Fecha de emisión': '2026-10-05T10:15:30.123-06:00',
    'Número de Autorización': UUID(1),
    'Tipo de DTE (nombre)': 'FACT',
    Serie: 'AB12CD34',
    'Número del DTE': '1001',
    'NIT del emisor': '1234567',
    'Nombre completo del emisor': 'Proveedor Ñandú, S.A.',
    'ID del receptor': '7654321',
    Estado: 'Vigente',
    Moneda: 'GTQ',
    'Gran Total (Moneda Original)': '112.00',
    'IVA (monto de este impuesto)': '12.00',
    'Marca de anulado': 'No',
    'Fecha de anulación': '',
    'Petróleo (monto de este impuesto)': '0',
    ...cambios,
  };
  return ENCABEZADOS.map((titulo) => valores[titulo] ?? '');
};

function archivo(filas: string[][], encabezados = ENCABEZADOS): ArchivoDeFilas {
  return {
    formato: 'xls',
    filaDeEncabezados: 1,
    encabezados,
    reconocidos: [],
    noReconocidos: encabezados.filter((titulo) => titulo === 'Columna nueva'),
    filas: filas.map((celdas, i) => ({ numero: i + 2, celdas })),
  };
}

const opciones = (cambios: Partial<OpcionesDeLectura> = {}): OpcionesDeLectura => ({
  nitDeLaEmpresa: '7654321',
  zonaHoraria: 'America/Guatemala',
  decimales: 2,
  hoy: '2026-11-01',
  mapa: construirMapa(),
  ...cambios,
});

const leer = (filas: string[][], cambios?: Partial<OpcionesDeLectura>) =>
  leerDteDeLaSat(archivo(filas), opciones(cambios));

describe('lectura del DTE de la SAT: conversión', () => {
  it('convierte una fila con los encabezados reales y guarda la fila original', () => {
    const { filas, rechazos } = leer([base({ 'Columna nueva': 'x' })]);

    expect(rechazos).toEqual([]);
    expect(filas[0]?.datos).toMatchObject({
      autorizacionFel: UUID(1),
      tipoDte: 'FACT',
      serie: 'AB12CD34',
      numero: '1001',
      fechaEmision: '2026-10-05',
      nitEmisor: '1234567',
      nitReceptor: '7654321',
      total: '112.00',
      iva: '12.00',
      idp: '0.00',
      otrosImpuestos: '0.00',
      estadoSat: 'vigente',
      anuladoEnLaSatEl: null,
    });
    expect(filas[0]?.datos.filaOriginal['Columna nueva']).toBe('x');
    expect(filas[0]?.numeroDeFila).toBe(2);
  });

  it('el IDP viene en la columna «Petróleo» y los otros impuestos se suman con su detalle', () => {
    const fila = base({
      'Gran Total (Moneda Original)': '200.00',
      'Petróleo (monto de este impuesto)': '30.5',
      'Turismo Hospedaje (monto de este impuesto)': '10.255',
      'Bomberos (monto de este impuesto)': '0',
    });

    const datos = leer([fila]).filas[0]?.datos;

    expect(datos).toMatchObject({ idp: '30.50', otrosImpuestos: '10.26' });
    expect(datos?.otrosImpuestosDetalle).toEqual({ 'TURISMO HOSPEDAJE': '10.26' });
  });

  it('una nota con monto negativo se guarda positiva y el tipo puede venir como nombre', () => {
    const fila = base({ 'Tipo de DTE (nombre)': 'Nota de crédito', 'Gran Total (Moneda Original)': '-112.00' });

    expect(leer([fila]).filas[0]?.datos).toMatchObject({ tipoDte: 'NCRE', total: '112.00' });
  });

  it('anulado por estado, por marca o por fecha; sin fecha usa la de la carga', () => {
    const porMarca = base({ Estado: 'Vigente', 'Marca de anulado': 'Si' });
    const porFecha = base({ 'Número de Autorización': UUID(2), 'Fecha de anulación': '2026-10-20T08:00:00-06:00' });
    const porEstado = base({ 'Número de Autorización': UUID(3), Estado: 'Anulado' });

    const { filas } = leer([porMarca, porFecha, porEstado]);

    expect(filas.map((f) => [f.datos.estadoSat, f.datos.anuladoEnLaSatEl])).toEqual([
      ['anulado', '2026-11-01'],
      ['anulado', '2026-10-20'],
      ['anulado', '2026-11-01'],
    ]);
  });

  it('los montos con muchos decimales se redondean hacia arriba desde la mitad', () => {
    const fila = base({ 'Gran Total (Moneda Original)': '112.004999', 'IVA (monto de este impuesto)': '12.005' });

    expect(leer([fila]).filas[0]?.datos).toMatchObject({ total: '112.00', iva: '12.01' });
  });

  it('con 4 decimales de configuración compara con más precisión y guarda dos', () => {
    const fila = base({ 'Gran Total (Moneda Original)': '10.0049', 'IVA (monto de este impuesto)': '10.0049' });

    const { filas, rechazos } = leer([fila], { decimales: 4 });

    expect(rechazos).toEqual([]);
    expect(filas[0]?.datos).toMatchObject({ total: '10.00', iva: '10.00' });
  });

  it('si al redondear las partes pasan del total por centavos, baja el IVA y avisa', () => {
    const fila = base({
      'Gran Total (Moneda Original)': '0.0149',
      'IVA (monto de este impuesto)': '0.005',
      'Petróleo (monto de este impuesto)': '0.005',
    });

    const resultado = leer([fila], { decimales: 4 });

    expect(resultado.filas[0]?.datos).toMatchObject({ total: '0.01', iva: '0.00', idp: '0.01' });
    expect(resultado.avisos.join(' ')).toContain('se bajó el IVA');
  });
});

describe('lectura del DTE de la SAT: rechazos', () => {
  const motivoDe = (cambios: Record<string, string>) => leer([base(cambios)]).rechazos[0]?.motivo;

  it('rechaza receptor distinto, moneda ajena, tipo sin familia, total en cero y partes que pasan del total', () => {
    expect(motivoDe({ 'ID del receptor': '999' })).toBe('nit_receptor_distinto');
    expect(motivoDe({ Moneda: 'USD' })).toBe('moneda_no_admitida');
    expect(motivoDe({ 'Tipo de DTE (nombre)': 'FEPE' })).toBe('tipo_sin_familia');
    expect(motivoDe({ 'Gran Total (Moneda Original)': '0' })).toBe('total_en_cero');
    expect(motivoDe({ 'IVA (monto de este impuesto)': '200' })).toBe('impuestos_exceden_total');
  });

  it('rechaza datos ilegibles con la fila y la autorización', () => {
    const resultado = leer([base({ Serie: '' }), base({ 'Número de Autorización': 'no-es-uuid' })]);

    expect(resultado.rechazos.map((r) => [r.fila, r.motivo, r.autorizacion])).toEqual([
      [2, 'dato_ilegible', UUID(1)],
      [3, 'dato_ilegible', null],
    ]);
  });

  it('una autorización repetida idéntica cuenta aparte; con datos distintos se rechaza la segunda', () => {
    const igual = base();
    const distinta = base({ 'Gran Total (Moneda Original)': '500.00' });

    const resultado = leer([igual, igual, distinta]);

    expect(resultado.filas).toHaveLength(1);
    expect(resultado.repetidasIguales).toBe(1);
    expect(resultado.rechazos.map((r) => r.motivo)).toEqual(['autorizacion_repetida']);
  });

  it('una fila rechazada no frena a las demás', () => {
    const resultado = leer([base({ Moneda: 'USD' }), base({ 'Número de Autorización': UUID(5) })]);

    expect(resultado.filas).toHaveLength(1);
    expect(resultado.rechazos).toHaveLength(1);
  });
});

describe('lectura del DTE de la SAT: archivo y mapa', () => {
  it('sin columnas obligatorias da un error con lo que falta y lo que hay', () => {
    const solo = ENCABEZADOS.filter((titulo) => titulo !== 'Serie');
    const error = (() => {
      try {
        leerDteDeLaSat(archivo([], solo), opciones());
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(ArchivoDeLaSatNoReconocido);
    expect((error as ArchivoDeLaSatNoReconocido).detalles).toMatchObject({ faltan: ['Serie'] });
  });

  it('avisa lo que supuso (moneda y receptor) y los montos en columnas desconocidas', () => {
    const sin = ENCABEZADOS.filter((t) => t !== 'Moneda' && t !== 'ID del receptor');
    const fila = base({ 'Columna nueva': '25.00' }).filter((_, i) => sin.includes(ENCABEZADOS[i] as string));

    const { avisos } = leerDteDeLaSat(archivo([fila], sin), opciones());

    expect(avisos.join(' ')).toContain('no trae la moneda');
    expect(avisos.join(' ')).toContain('NIT del receptor');
    expect(avisos.join(' ')).toContain('Columna nueva');
  });

  it('los encabezados adicionales de soporte suman variantes; un JSON inválido se ignora y se avisa', () => {
    const avisos: string[] = [];
    const extra = interpretarEncabezadosAdicionales(
      '{"serie": ["Serie del DTE"], "BOMBEROS": ["Bomberos nuevo"]}',
      (m) => avisos.push(m),
    );
    const titulos = ENCABEZADOS.map((t) => (t === 'Serie' ? 'Serie del DTE' : t));

    const resultado = leerDteDeLaSat(archivo([base()], titulos), opciones({ mapa: construirMapa(extra) }));

    expect(resultado.filas[0]?.datos.serie).toBe('AB12CD34');
    expect(interpretarEncabezadosAdicionales('{roto', (m) => avisos.push(m))).toEqual({});
    expect(avisos).toHaveLength(1);
  });
});

describe('valores de la SAT', () => {
  it.each([
    ['2026-10-05T10:15:30.123-06:00', '2026-10-05'],
    ['2026-10-05T10:15:30-06:00', '2026-10-05'],
    ['2026-10-05T10:15:30', '2026-10-05'],
    ['2026-10-06T03:00:00Z', '2026-10-05'],
    ['2026-10-05T23:30:00-0600', '2026-10-05'],
    ['05/10/2026 10:15:30', '2026-10-05'],
    ['5/10/2026', '2026-10-05'],
    ['2026-10-05', '2026-10-05'],
    ['2026-02-30', null],
    ['basura', null],
  ])('la fecha %s es %s', (texto, esperado) => {
    expect(leerFechaDeLaSat(texto, 'America/Guatemala')).toBe(esperado);
  });

  it.each([
    ['1,250.5', 2, '1250.50'],
    ['Q 5', 2, '5.00'],
    ['-12.345', 2, '12.35'],
    ['0.000001', 2, '0.00'],
    ['99.999999', 2, '100.00'],
    ['1.23456', 4, '1.2346'],
    ['abc', 2, null],
    ['1.2.3', 2, null],
  ])('el monto %s con %i decimales es %s', (texto, decimales, esperado) => {
    expect(leerMonto(texto, decimales)).toBe(esperado);
  });
});
