import { describe, expect, it } from 'vitest';
import { DteRecibido, type DatosDelDte } from '../../../dominio/dte-recibido.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { clasificarCarga, type ConocimientoPrevio } from './clasificador-de-carga.js';

const EMPRESA = crypto.randomUUID();

const datos = (autorizacionFel: string, cambios: Partial<DatosDelDte> = {}): DatosDelDte => ({
  autorizacionFel,
  tipoDte: 'FACT',
  serie: 'A',
  numero: '1',
  fechaEmision: '2026-10-05',
  nitEmisor: '1234567',
  nombreEmisor: 'Proveedor',
  nitReceptor: '7654321',
  total: '112.00',
  iva: '12.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  otrosImpuestosDetalle: {},
  filaOriginal: {},
  estadoSat: 'vigente',
  anuladoEnLaSatEl: null,
  ...cambios,
});

const filaDe = (d: DatosDelDte) => ({ numeroDeFila: 2, datos: d });

function conocimiento(cambios: Partial<ConocimientoPrevio> = {}): ConocimientoPrevio {
  return {
    empresaId: EMPRESA,
    loteId: 'lote-2',
    existentes: new Map(),
    documentosVigentes: new Map(),
    registradasEnOtraEmpresa: new Set(),
    proveedoresPorNit: new Map(),
    ...cambios,
  };
}

describe('clasificar la carga de la SAT', () => {
  it('una fila nueva entra pendiente, con el proveedor activo del NIT', () => {
    const plan = clasificarCarga(
      [filaDe(datos('a'))],
      conocimiento({ proveedoresPorNit: new Map([['1234567', { id: 'p1', activo: true }]]) }),
    );

    expect(plan.nuevas.map((f) => [f.estado, f.instantanea().proveedorId])).toEqual([['pendiente', 'p1']]);
  });

  it('un proveedor inactivo no se propone', () => {
    const plan = clasificarCarga(
      [filaDe(datos('a'))],
      conocimiento({ proveedoresPorNit: new Map([['1234567', { id: 'p1', activo: false }]]) }),
    );

    expect(plan.nuevas[0]?.instantanea().proveedorId).toBeNull();
  });

  it('entra registrada si el libro ya la tiene y bloqueada si la tiene otra empresa de la cuenta', () => {
    const plan = clasificarCarga(
      [filaDe(datos('a')), filaDe(datos('b'))],
      conocimiento({
        documentosVigentes: new Map([['a', 'doc-1']]),
        registradasEnOtraEmpresa: new Set(['b']),
      }),
    );

    expect(plan.nuevas.map((f) => f.estado)).toEqual(['registrado', 'bloqueado']);
    expect(plan.bloqueadas).toBe(1);
  });

  it('una fila que ya estaba sin cambios solo cambia de lote; con cambios se actualiza y cuenta la anulación', () => {
    const igual = DteRecibido.crear({ empresaId: Identificador.desde(EMPRESA), loteId: 'lote-1', datos: datos('a') });
    const cambia = DteRecibido.crear({ empresaId: Identificador.desde(EMPRESA), loteId: 'lote-1', datos: datos('b') });
    const existentes = new Map([
      ['a', igual],
      ['b', cambia],
    ]);

    const plan = clasificarCarga(
      [filaDe(datos('a')), filaDe(datos('b', { estadoSat: 'anulado', anuladoEnLaSatEl: '2026-10-20' }))],
      conocimiento({ existentes }),
    );

    expect(plan.sinCambio).toEqual([igual]);
    expect(plan.actualizadas.map((a) => a.campos)).toEqual([['estadoSat', 'anuladoEnLaSatEl']]);
    expect(plan.anuladasEnLaSat).toBe(1);
    expect(cambia.instantanea()).toMatchObject({ estadoSat: 'anulado', loteId: 'lote-2', estado: 'pendiente' });
  });

  it('una registrada que pasa a anulada se cuenta aparte para avisar', () => {
    const registrada = DteRecibido.crear({
      empresaId: Identificador.desde(EMPRESA),
      loteId: 'lote-1',
      datos: datos('a'),
    });
    registrada.registrar('doc-1');

    const plan = clasificarCarga(
      [filaDe(datos('a', { estadoSat: 'anulado', anuladoEnLaSatEl: '2026-10-20' }))],
      conocimiento({ existentes: new Map([['a', registrada]]) }),
    );

    expect(plan.anuladasYaRegistradas).toBe(1);
  });
});
