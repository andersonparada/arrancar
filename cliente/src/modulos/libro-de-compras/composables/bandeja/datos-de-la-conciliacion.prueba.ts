import { describe, expect, it } from 'vitest';
import type { ClaveDeResultado, ItemDeConciliacion } from '../../servicios/conciliacion.api';
import {
  accionesDelItem,
  cantidadConciliada,
  cantidadPorRevisar,
  grupoInicial,
  numeroDelItem,
  tipoDeValorDelCampo,
  tituloDelItem,
} from './datos-de-la-conciliacion';

const resumen = (cambios: Partial<Record<ClaveDeResultado, number>> = {}) => ({
  resumen: {
    cuadra: 0,
    conDiferencias: 0,
    enLaSatYNoEnArrancar: 0,
    enArrancarYNoEnLaSat: 0,
    sinDatosDeLaSat: 0,
    registradoEnOtroPeriodo: 0,
    anuladoEnLaSatYVigenteAqui: 0,
    descartado: 0,
    ...cambios,
  },
});

const item = (cambios: Partial<ItemDeConciliacion> = {}): ItemDeConciliacion => ({
  autorizacionFel: 'AAAA',
  tipoDte: 'FACT',
  serie: 'A',
  numero: '123',
  fechaEmision: '2026-09-10',
  nitEmisor: '1234567',
  nombreEmisor: 'Ferretería La Paz',
  total: '112.00',
  iva: '12.00',
  documentoId: 'd1',
  dteId: 'f1',
  periodoDelDocumento: '2026-09-01',
  documentoFueraDelLibro: false,
  estadoEnLaBandeja: null,
  motivoDeBloqueo: null,
  motivoDeDescarte: null,
  diferencias: [],
  ...cambios,
});

describe('conteos de la conciliación', () => {
  it('por revisar suma solo los grupos que piden revisión', () => {
    const datos = resumen({
      cuadra: 10,
      conDiferencias: 2,
      enLaSatYNoEnArrancar: 3,
      enArrancarYNoEnLaSat: 1,
      anuladoEnLaSatYVigenteAqui: 1,
      sinDatosDeLaSat: 4,
      registradoEnOtroPeriodo: 5,
      descartado: 6,
    });
    expect(cantidadPorRevisar(datos)).toBe(7);
    expect(cantidadConciliada(datos)).toBe(32);
  });

  it('un mes vacío no tiene nada por revisar ni conciliado', () => {
    expect(cantidadPorRevisar(resumen())).toBe(0);
    expect(cantidadConciliada(resumen())).toBe(0);
  });

  it('abre primero el grupo que pide revisión y, si no hay, el que cuadra', () => {
    expect(grupoInicial(resumen({ cuadra: 5, enLaSatYNoEnArrancar: 1, conDiferencias: 2 }))).toBe('conDiferencias');
    expect(grupoInicial(resumen({ cuadra: 5, descartado: 1 }))).toBe('cuadra');
    expect(grupoInicial(resumen())).toBe('cuadra');
  });
});

describe('acciones de cada línea', () => {
  it('lo que está en la SAT y no registrado se registra o se descarta si está pendiente', () => {
    const pendiente = item({ documentoId: null, estadoEnLaBandeja: 'pendiente' });
    expect(accionesDelItem('enLaSatYNoEnArrancar', pendiente)).toEqual(['verEnLaBandeja', 'descartar']);
  });

  it('una bloqueada solo se puede descartar y una registrada no ofrece nada', () => {
    expect(accionesDelItem('enLaSatYNoEnArrancar', item({ estadoEnLaBandeja: 'bloqueado' }))).toEqual(['descartar']);
    expect(accionesDelItem('enLaSatYNoEnArrancar', item({ estadoEnLaBandeja: 'registrado' }))).toEqual([]);
  });

  it('lo registrado se abre; sin documento no hay nada que abrir', () => {
    expect(accionesDelItem('conDiferencias', item())).toEqual(['abrirDocumento']);
    expect(accionesDelItem('anuladoEnLaSatYVigenteAqui', item())).toEqual(['abrirDocumento']);
    expect(accionesDelItem('conDiferencias', item({ documentoId: null }))).toEqual([]);
  });

  it('lo descartado se restaura', () => {
    expect(accionesDelItem('descartado', item())).toEqual(['restaurar']);
    expect(accionesDelItem('descartado', item({ dteId: null }))).toEqual([]);
  });
});

describe('textos de una línea', () => {
  it('el título lleva el tipo y el número con su serie', () => {
    expect(tituloDelItem(item())).toBe('FACT A-123');
    expect(tituloDelItem(item({ tipoDte: null, serie: null }))).toBe('123');
    expect(numeroDelItem(item({ serie: null }))).toBe('123');
  });

  it('cada campo comparado se escribe según su clase', () => {
    expect(tipoDeValorDelCampo('total')).toBe('dinero');
    expect(tipoDeValorDelCampo('otrosImpuestos')).toBe('dinero');
    expect(tipoDeValorDelCampo('fechaEmision')).toBe('fecha');
    expect(tipoDeValorDelCampo('nitEmisor')).toBe('texto');
  });
});
