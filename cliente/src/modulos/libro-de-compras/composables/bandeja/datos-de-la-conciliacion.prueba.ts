import { describe, expect, it } from 'vitest';
import type { ClaveDeResultado, ItemDeConciliacion } from '../../servicios/conciliacion.api';
import {
  accionesDelItem,
  cantidadConciliada,
  cantidadPorRevisar,
  grupoInicial,
  numeroDelItem,
  rutaDeLaAccion,
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
    noVaEnElLibro: 0,
    anuladoEnLaSatYVigenteAqui: 0,
    descartado: 0,
    anterioresALaFechaDeInicio: 0,
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
  enPlazoDeCredito: false,
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
      noVaEnElLibro: 2,
      descartado: 6,
      anterioresALaFechaDeInicio: 9,
    });
    expect(cantidadPorRevisar(datos)).toBe(7);
    // Los de antes de la fecha de inicio son informativos: no cuentan como conciliados.
    expect(cantidadConciliada(datos)).toBe(34);
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

describe('lo anterior a la fecha de inicio en la conciliación', () => {
  it('una fila pendiente se registra aquí o se descarta; una descartada se restaura', () => {
    const grupo = 'anterioresALaFechaDeInicio';
    const pendiente = item({ documentoId: null, estadoEnLaBandeja: 'pendiente' });
    expect(accionesDelItem(grupo, pendiente)).toEqual(['registrarAqui', 'descartar']);
    expect(accionesDelItem(grupo, item({ estadoEnLaBandeja: 'descartado' }))).toEqual(['restaurar']);
  });

  it('una bloqueada, una ya registrada o una sin fila en la bandeja no ofrecen nada', () => {
    const grupo = 'anterioresALaFechaDeInicio';
    expect(accionesDelItem(grupo, item({ estadoEnLaBandeja: 'bloqueado' }))).toEqual([]);
    expect(accionesDelItem(grupo, item({ estadoEnLaBandeja: 'registrado' }))).toEqual([]);
    expect(accionesDelItem(grupo, item({ dteId: null, estadoEnLaBandeja: 'pendiente' }))).toEqual([]);
  });

  it('el grupo no abre por sí solo ni cuenta por revisar', () => {
    expect(grupoInicial(resumen({ anterioresALaFechaDeInicio: 4 }))).toBe('cuadra');
    expect(cantidadPorRevisar(resumen({ anterioresALaFechaDeInicio: 4 }))).toBe(0);
    expect(cantidadConciliada(resumen({ anterioresALaFechaDeInicio: 4 }))).toBe(0);
  });
});

describe('rutaDeLaAccion', () => {
  it('abrir la factura y registrar aquí cambian de pantalla; lo demás no', () => {
    expect(rutaDeLaAccion('abrirDocumento', item({ documentoId: 'd1' }))).toEqual({
      name: 'libro-de-compras.documentos.ficha',
      params: { documentoId: 'd1' },
    });
    expect(rutaDeLaAccion('registrarAqui', item({ dteId: 'f1' }))).toEqual({
      name: 'libro-de-compras.documentos.nuevo',
      query: { desdeDte: 'f1' },
    });
    expect(rutaDeLaAccion('registrarAqui', item({ dteId: null }))).toBeNull();
    expect(rutaDeLaAccion('descartar', item())).toBeNull();
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
