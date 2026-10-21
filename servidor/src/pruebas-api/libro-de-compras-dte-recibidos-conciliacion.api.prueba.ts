import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  primerDiaDelMes,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  operadorDeLaBandeja,
  RUTA_DTE,
  sembrarFila,
  sembrarLote,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const RUTA = `${RUTA_DTE}/conciliacion`;
const PERIODO = primerDiaDelMes(0);
const PERIODO_ANTERIOR = primerDiaDelMes(-1);
const MITAD_DEL_MES_ANTERIOR = `${PERIODO_ANTERIOR.slice(0, 7)}-10`;
let escenario: EscenarioDeDocumentos;
let operador: Operador;
let loteId: string;
let soloVer: ClienteApi;

const propietario = (): ClienteApi => escenario.cuenta.propietario;

/** Registra una factura del libro y devuelve su id y lo que se mandó (de ahí salen los datos de su fila). */
async function registrar(cambios: Record<string, unknown> = {}) {
  const cuerpo = documentoDePrueba(escenario, cambios);
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { id: respuesta.cuerpo.documento.id as string, cuerpo };
}

/** La fila de la SAT del mismo DTE que un documento; `cambios` la hace distinta. */
const filaDeLaSat = (cuerpo: Record<string, any>, cambios: CambiosDeLaFila = {}) =>
  sembrarFila(operador, loteId, {
    nitEmisor: cuerpo.nitEmisor,
    serie: cuerpo.serie,
    numero: cuerpo.numero,
    autorizacionFel: cuerpo.autorizacionFel,
    fechaEmision: cuerpo.fechaEmision,
    ...cambios,
  });

async function conciliacion(periodo = PERIODO) {
  const respuesta = await propietario().get(`${RUTA}?periodo=${periodo}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
}

const enLaLista = (lista: any[], campo: 'documentoId' | 'dteId', id: string) => lista.find((i) => i[campo] === id);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'conciliacionsat');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  operador = await operadorDeLaBandeja(escenario);
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo ver',
    apellidos: 'Conciliacion',
    permisos: ['libro-de-compras.documentos.ver'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('conciliación por período: sin datos de la SAT', () => {
  it('sin ningún lote, un documento sin fila es «sin datos de la SAT» y no un faltante', async () => {
    const { id } = await registrar();

    const resultado = await conciliacion();

    expect(resultado.hayDatosDeLaSat).toBe(false);
    expect(enLaLista(resultado.resultados.sinDatosDeLaSat, 'documentoId', id)).toBeTruthy();
    expect(resultado.resumen).toMatchObject({ sinDatosDeLaSat: 1, enArrancarYNoEnLaSat: 0, cuadra: 0 });
  });

  it('un lote de otro mes no cubre el período', async () => {
    await sembrarLote(operador, { emisionDesde: '2020-01-05', emisionHasta: '2020-01-30' });

    const resultado = await conciliacion();

    expect(resultado.hayDatosDeLaSat).toBe(false);
    expect(resultado.resumen.enArrancarYNoEnLaSat).toBe(0);
  });
});

describe('conciliación por período: con el lote del mes', () => {
  const casos = {} as Record<
    | 'soloEnArrancar'
    | 'igual'
    | 'filaIgual'
    | 'centavos'
    | 'filaCentavos'
    | 'malEscrita'
    | 'filaMalEscrita'
    | 'anuladaEnLaSat'
    | 'filaAnulada'
    | 'soloEnLaSat'
    | 'descartada'
    | 'bloqueada'
    | 'anuladaSinDocumento',
    string
  >;

  beforeAll(async () => {
    loteId = await sembrarLote(operador, { emisionDesde: PERIODO, emisionHasta: HOY });
    const solo = await registrar();
    casos.soloEnArrancar = solo.id;
    const igual = await registrar();
    casos.igual = igual.id;
    casos.filaIgual = await filaDeLaSat(igual.cuerpo);
    const centavos = await registrar();
    casos.centavos = centavos.id;
    casos.filaCentavos = await filaDeLaSat(centavos.cuerpo, { iva: '119.99' });
    const mal = await registrar();
    casos.malEscrita = mal.id;
    casos.filaMalEscrita = await filaDeLaSat(mal.cuerpo, { autorizacionFel: crypto.randomUUID() });
    const anulada = await registrar();
    casos.anuladaEnLaSat = anulada.id;
    casos.filaAnulada = await filaDeLaSat(anulada.cuerpo, { estadoSat: 'anulado', anuladoEnLaSatEl: HOY });
    casos.soloEnLaSat = await sembrarFila(operador, loteId, { fechaEmision: HOY });
    casos.descartada = await sembrarFila(operador, loteId, { fechaEmision: HOY });
    casos.bloqueada = await sembrarFila(operador, loteId, { fechaEmision: HOY });
    casos.anuladaSinDocumento = await sembrarFila(operador, loteId, {
      fechaEmision: HOY,
      estadoSat: 'anulado',
      anuladoEnLaSatEl: HOY,
    });
    const descarte = await propietario().post(`${RUTA_DTE}/descartar`, {
      ids: [casos.descartada],
      motivo: 'No es de la empresa',
    });
    expect(descarte.estado, JSON.stringify(descarte.cuerpo)).toBe(200);
    await consultar(
      `update libro_de_compras.dte_recibidos set estado = 'bloqueado', motivo_de_bloqueo = 'registrado_en_otra_empresa' where id = $1`,
      [casos.bloqueada],
    );
  });

  it('cuadra cuando coinciden tipo, NIT, serie, número, fecha, total, IVA, IDP y otros', async () => {
    const resultado = await conciliacion();

    expect(resultado.hayDatosDeLaSat).toBe(true);
    const item = enLaLista(resultado.resultados.cuadra, 'documentoId', casos.igual);
    expect(item).toMatchObject({ dteId: casos.filaIgual, diferencias: [], periodoDelDocumento: PERIODO });
  });

  it('un documento sin fila, con el mes cubierto, es un faltante de la SAT', async () => {
    const resultado = await conciliacion();

    expect(enLaLista(resultado.resultados.enArrancarYNoEnLaSat, 'documentoId', casos.soloEnArrancar)).toBeTruthy();
    expect(resultado.resultados.sinDatosDeLaSat).toHaveLength(0);
  });

  it('una diferencia de centavos en el IVA se informa: manda el DTE', async () => {
    const resultado = await conciliacion();

    const item = enLaLista(resultado.resultados.conDiferencias, 'documentoId', casos.centavos);
    expect(item.diferencias).toEqual([{ campo: 'iva', arrancar: '120.00', sat: '119.99' }]);
  });

  it('cruza por NIT, serie y número cuando la autorización está mal escrita', async () => {
    const resultado = await conciliacion();

    const item = enLaLista(resultado.resultados.conDiferencias, 'documentoId', casos.malEscrita);
    expect(item.dteId).toBe(casos.filaMalEscrita);
    expect(item.diferencias.map((d: any) => d.campo)).toEqual(['autorizacionFel']);
    expect(enLaLista(resultado.resultados.enLaSatYNoEnArrancar, 'dteId', casos.filaMalEscrita)).toBeUndefined();
  });

  it('una fila anulada en la SAT cuyo documento sigue vigente se ofrece para anular', async () => {
    const resultado = await conciliacion();

    const item = enLaLista(resultado.resultados.anuladoEnLaSatYVigenteAqui, 'documentoId', casos.anuladaEnLaSat);
    expect(item.dteId).toBe(casos.filaAnulada);
  });

  it('una fila vigente sin documento está en la SAT y no en Arrancar; la descartada y la bloqueada llevan su situación', async () => {
    const resultado = await conciliacion();

    const faltantes = resultado.resultados.enLaSatYNoEnArrancar;
    expect(enLaLista(faltantes, 'dteId', casos.soloEnLaSat)).toMatchObject({
      documentoId: null,
      estadoEnLaBandeja: 'pendiente',
    });
    expect(enLaLista(faltantes, 'dteId', casos.bloqueada)).toMatchObject({
      estadoEnLaBandeja: 'bloqueado',
      motivoDeBloqueo: 'registrado_en_otra_empresa',
    });
    expect(enLaLista(resultado.resultados.descartado, 'dteId', casos.descartada)).toMatchObject({
      motivoDeDescarte: 'No es de la empresa',
    });
    expect(enLaLista(faltantes, 'dteId', casos.descartada)).toBeUndefined();
  });

  it('una fila anulada en la SAT sin documento no aparece en ningún resultado', async () => {
    const resultado = await conciliacion();

    const todas = Object.values(resultado.resultados).flat() as any[];
    expect(enLaLista(todas, 'dteId', casos.anuladaSinDocumento)).toBeUndefined();
    expect(resultado.resumen).toEqual({
      cuadra: 1,
      conDiferencias: 2,
      enLaSatYNoEnArrancar: 2,
      registradoEnOtroPeriodo: 0,
      enArrancarYNoEnLaSat: 2,
      sinDatosDeLaSat: 0,
      anuladoEnLaSatYVigenteAqui: 1,
      descartado: 1,
    });
  });

  it('un DTE emitido en el mes cuyo documento va en otro período es informativo', async () => {
    const lote = await sembrarLote(operador, { emisionDesde: MITAD_DEL_MES_ANTERIOR, emisionHasta: HOY });
    const traslado = await registrar({
      fechaEmision: MITAD_DEL_MES_ANTERIOR,
      periodo: PERIODO,
      fechaRecepcion: HOY,
    });
    const fila = await sembrarFila(operador, lote, {
      nitEmisor: traslado.cuerpo.nitEmisor as string,
      serie: traslado.cuerpo.serie as string,
      numero: traslado.cuerpo.numero as string,
      autorizacionFel: traslado.cuerpo.autorizacionFel as string,
      fechaEmision: MITAD_DEL_MES_ANTERIOR,
    });

    const anterior = await conciliacion(PERIODO_ANTERIOR);
    const item = enLaLista(anterior.resultados.registradoEnOtroPeriodo, 'documentoId', traslado.id);
    expect(item).toMatchObject({ dteId: fila, periodoDelDocumento: PERIODO, documentoFueraDelLibro: false });
    expect(anterior.resultados.enLaSatYNoEnArrancar).toHaveLength(0);

    const actual = await conciliacion();
    expect(enLaLista(actual.resultados.cuadra, 'documentoId', traslado.id)).toMatchObject({ dteId: fila });
    expect(enLaLista(actual.resultados.registradoEnOtroPeriodo, 'dteId', fila)).toBeUndefined();
  });
});

describe('permisos y forma de la consulta', () => {
  it('acepta AAAA-MM y AAAA-MM-01 y rechaza lo demás', async () => {
    const corto = await propietario().get(`${RUTA}?periodo=${PERIODO.slice(0, 7)}`);
    expect(corto.estado).toBe(200);
    expect(corto.cuerpo.periodo).toBe(PERIODO);
    expect((await propietario().get(`${RUTA}?periodo=${PERIODO.slice(0, 7)}-15`)).estado).toBe(400);
    expect((await propietario().get(RUTA)).estado).toBe(400);
  });

  it('exige documentos.importar: quien solo ve documentos recibe 403', async () => {
    expect((await soloVer.get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(403);
    expect((await entorno.nuevoCliente().get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(401);
  });
});
