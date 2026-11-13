import { describe, expect, it } from 'vitest';
import { CoberturaDeLotes } from './cobertura-de-la-sat.js';
import { conciliar } from './conciliador.js';
import type { DocumentoConciliable, FilaConciliable } from './tipos-de-conciliacion.js';

const AUTORIZACION = '11111111-1111-4111-8111-111111111111';
const cobertura = new CoberturaDeLotes([{ desde: '2026-02-01', hasta: '2026-05-31' }]);

const fila = (cambios: Partial<FilaConciliable> = {}): FilaConciliable => ({
  id: 'fila-1',
  autorizacionFel: AUTORIZACION,
  tipoDte: 'FACT',
  serie: 'A',
  numero: '10',
  fechaEmision: '2026-03-10',
  nitEmisor: '576937K',
  nombreEmisor: 'Agro del Norte',
  total: '1120.00',
  iva: '120.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  estadoSat: 'vigente',
  estado: 'pendiente',
  motivoDeBloqueo: null,
  motivoDeDescarte: null,
  ...cambios,
});

const documento = (cambios: Partial<DocumentoConciliable> = {}): DocumentoConciliable => ({
  id: 'doc-1',
  tipoDte: 'FACT',
  autorizacionFel: AUTORIZACION,
  nitEmisor: '576937K',
  nombreEmisor: 'Agro del Norte',
  serie: 'A',
  numero: '10',
  fechaEmision: '2026-03-10',
  periodo: '2026-03-01',
  fueraDelLibro: false,
  total: '1120.00',
  iva: '120.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  ...cambios,
});

const entrada = (filas: FilaConciliable[], fechaDeInicio: string | null, documentos: DocumentoConciliable[] = []) => ({
  periodo: '2026-03-01',
  documentos,
  filas,
  cobertura,
  fechaDeInicio,
});

describe('conciliar con fecha de inicio', () => {
  it('una fila anterior sin documento va al grupo informativo y no a «en la SAT y no en Arrancar»', () => {
    const resultado = conciliar(entrada([fila()], '2026-05-01'));

    expect(resultado.anterioresALaFechaDeInicio).toHaveLength(1);
    expect(resultado.enLaSatYNoEnArrancar).toHaveLength(0);
  });

  it('una fila anterior descartada también va al grupo', () => {
    const resultado = conciliar(entrada([fila({ estado: 'descartado', motivoDeDescarte: 'x' })], '2026-05-01'));

    expect(resultado.anterioresALaFechaDeInicio).toHaveLength(1);
    expect(resultado.descartado).toHaveLength(0);
  });

  it('una fila anterior con documento en Arrancar se concilia como siempre', () => {
    const resultado = conciliar(entrada([fila({ estado: 'registrado' })], '2026-05-01', [documento()]));

    expect(resultado.cuadra).toHaveLength(1);
    expect(resultado.anterioresALaFechaDeInicio).toHaveLength(0);
  });

  it('sin fecha de inicio nada se marca', () => {
    const resultado = conciliar(entrada([fila()], null));

    expect(resultado.enLaSatYNoEnArrancar).toHaveLength(1);
    expect(resultado.anterioresALaFechaDeInicio).toHaveLength(0);
  });

  it('en un mes partido por la fecha de inicio, solo lo anterior va al grupo', () => {
    const filas = [fila({ id: 'a', fechaEmision: '2026-03-10' }), fila({ id: 'b', fechaEmision: '2026-03-20' })];
    const resultado = conciliar(entrada(filas, '2026-03-15'));

    expect(resultado.anterioresALaFechaDeInicio.map((i) => i.dteId)).toEqual(['a']);
    expect(resultado.enLaSatYNoEnArrancar.map((i) => i.dteId)).toEqual(['b']);
  });

  it('destaca las del plazo de crédito: el mes de inicio y los dos anteriores', () => {
    const filas = [fila({ id: 'a', fechaEmision: '2026-03-10' })];

    expect(conciliar(entrada(filas, '2026-05-20')).anterioresALaFechaDeInicio[0]?.enPlazoDeCredito).toBe(true);
    expect(conciliar(entrada(filas, '2026-06-01')).anterioresALaFechaDeInicio[0]?.enPlazoDeCredito).toBe(false);
  });

  it('una fila anulada en la SAT y sin documento no aparece', () => {
    const resultado = conciliar(entrada([fila({ estadoSat: 'anulado' })], '2026-05-01'));

    expect(resultado.anterioresALaFechaDeInicio).toHaveLength(0);
  });
});
