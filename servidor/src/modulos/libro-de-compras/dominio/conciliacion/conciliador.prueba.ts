import { describe, expect, it } from 'vitest';
import { CoberturaDeLotes } from './cobertura-de-la-sat.js';
import { conciliar } from './conciliador.js';
import type { DocumentoConciliable, FilaConciliable } from './tipos-de-conciliacion.js';

const PERIODO = '2026-03-01';
const AUTORIZACION = '11111111-1111-4111-8111-111111111111';

const documento = (cambios: Partial<DocumentoConciliable> = {}): DocumentoConciliable => ({
  id: 'doc-1',
  tipoDte: 'FACT',
  autorizacionFel: AUTORIZACION,
  nitEmisor: '576937K',
  nombreEmisor: 'Agro del Norte',
  serie: 'A',
  numero: '10',
  fechaEmision: '2026-03-10',
  periodo: PERIODO,
  fueraDelLibro: false,
  total: '1120.00',
  iva: '120.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  ...cambios,
});

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
  estado: 'registrado',
  motivoDeBloqueo: null,
  motivoDeDescarte: null,
  ...cambios,
});

const cobertura = new CoberturaDeLotes([{ desde: '2026-03-02', hasta: '2026-03-28' }]);
const sinLotes = new CoberturaDeLotes([]);

describe('conciliar', () => {
  it('cuadra cuando todo coincide, sin importar mayúsculas ni ceros finales', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [documento({ serie: 'a', total: '1120' })],
      filas: [fila()],
      cobertura,
    });

    expect(resultado.cuadra).toHaveLength(1);
    expect(resultado.conDiferencias).toHaveLength(0);
  });

  it('lista cada dato distinto, con el valor de Arrancar y el de la SAT', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [documento({ idp: '5.00', otrosImpuestos: '1.00', fechaEmision: '2026-03-09' })],
      filas: [fila({ total: '1121.00' })],
      cobertura,
    });

    expect(resultado.conDiferencias[0]?.diferencias).toEqual([
      { campo: 'fechaEmision', arrancar: '2026-03-09', sat: '2026-03-10' },
      { campo: 'total', arrancar: '1120.00', sat: '1121.00' },
      { campo: 'idp', arrancar: '5.00', sat: '0.00' },
      { campo: 'otrosImpuestos', arrancar: '1.00', sat: '0.00' },
    ]);
  });

  it('cruza por serie y número cuando la autorización no coincide', () => {
    const otra = '22222222-2222-4222-8222-222222222222';
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [documento()],
      filas: [fila({ autorizacionFel: otra })],
      cobertura,
    });

    expect(resultado.conDiferencias[0]?.diferencias.map((d) => d.campo)).toEqual(['autorizacionFel']);
    expect(resultado.enLaSatYNoEnArrancar).toHaveLength(0);
  });

  it('el cruce por autorización gana al cruce por número', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [documento()],
      filas: [fila({ id: 'por-numero', autorizacionFel: '33333333-3333-4333-8333-333333333333' }), fila()],
      cobertura,
    });

    expect(resultado.cuadra[0]?.dteId).toBe('fila-1');
    expect(resultado.enLaSatYNoEnArrancar.map((i) => i.dteId)).toEqual(['por-numero']);
  });

  it('un documento sin fila es faltante con datos de ese mes y «sin datos» sin ellos', () => {
    const entrada = { periodo: PERIODO, documentos: [documento()], filas: [] };

    expect(conciliar({ ...entrada, cobertura }).enArrancarYNoEnLaSat).toHaveLength(1);
    expect(conciliar({ ...entrada, cobertura: sinLotes }).sinDatosDeLaSat).toHaveLength(1);
    expect(conciliar({ ...entrada, cobertura: sinLotes }).enArrancarYNoEnLaSat).toHaveLength(0);
  });

  it('una fila anulada con su documento vigente se ofrece para anular, esté donde esté el documento', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [documento({ periodo: '2026-04-01' })],
      filas: [fila({ estadoSat: 'anulado' })],
      cobertura,
    });

    expect(resultado.anuladoEnLaSatYVigenteAqui[0]?.documentoId).toBe('doc-1');
    expect(resultado.registradoEnOtroPeriodo).toHaveLength(0);
  });

  it('una fila del mes con documento en otro período, o fuera del libro, es informativa', () => {
    const otroPeriodo = conciliar({
      periodo: PERIODO,
      documentos: [documento({ periodo: '2026-04-01' })],
      filas: [fila()],
      cobertura,
    });
    const fuera = conciliar({
      periodo: PERIODO,
      documentos: [documento({ fueraDelLibro: true })],
      filas: [fila()],
      cobertura,
    });

    expect(otroPeriodo.registradoEnOtroPeriodo[0]).toMatchObject({ periodoDelDocumento: '2026-04-01' });
    expect(fuera.registradoEnOtroPeriodo[0]).toMatchObject({ documentoFueraDelLibro: true });
    expect(fuera.enArrancarYNoEnLaSat).toHaveLength(0);
  });

  it('las filas sin documento: faltante, descartada, y la anulada o de otro mes no aparecen', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [],
      filas: [
        fila({ id: 'a', autorizacionFel: AUTORIZACION, numero: '1', estado: 'pendiente' }),
        fila({ id: 'b', autorizacionFel: 'b', numero: '2', estado: 'descartado', motivoDeDescarte: 'No es nuestro' }),
        fila({ id: 'c', autorizacionFel: 'c', numero: '3', estado: 'pendiente', estadoSat: 'anulado' }),
        fila({ id: 'd', autorizacionFel: 'd', numero: '4', fechaEmision: '2026-04-01', estado: 'pendiente' }),
      ],
      cobertura,
    });

    expect(resultado.enLaSatYNoEnArrancar.map((i) => i.dteId)).toEqual(['a']);
    expect(resultado.descartado.map((i) => i.dteId)).toEqual(['b']);
    expect(Object.values(resultado).flat()).toHaveLength(2);
  });

  it('ordena cada lista por fecha, serie y número', () => {
    const resultado = conciliar({
      periodo: PERIODO,
      documentos: [
        documento({ id: 'x', numero: '10', autorizacionFel: 'x' }),
        documento({ id: 'y', numero: '9', autorizacionFel: 'y' }),
      ],
      filas: [],
      cobertura,
    });

    expect(resultado.enArrancarYNoEnLaSat.map((i) => i.numero)).toEqual(['9', '10']);
  });
});

describe('CoberturaDeLotes', () => {
  it('cubre el mes que toca el rango de algún lote', () => {
    const lotes = new CoberturaDeLotes([{ desde: '2026-02-20', hasta: '2026-03-03' }]);

    expect(lotes.cubreElMesDe('2026-03-31')).toBe(true);
    expect(lotes.cubreElMesDe('2026-02-01')).toBe(true);
    expect(lotes.cubreElMesDe('2026-04-01')).toBe(false);
    expect(lotes.cubreElMesDe('2026-01-31')).toBe(false);
  });
});
