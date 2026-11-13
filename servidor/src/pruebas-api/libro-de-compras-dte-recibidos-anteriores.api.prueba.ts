import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  prepararEscenario,
  primerDiaDelMes,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { operadorDeLaBandeja, RUTA_DTE, sembrarFila, sembrarLote } from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const INICIO = primerDiaDelMes(0);
const PERIODO_ANTERIOR = primerDiaDelMes(-1);
const EN_PLAZO = `${PERIODO_ANTERIOR.slice(0, 7)}-10`;
const LEJOS = `${primerDiaDelMes(-4).slice(0, 7)}-10`;

interface Empresa {
  escenario: EscenarioDeDocumentos;
  operador: Operador;
  loteId: string;
}

async function empresa(clave: string, fechaDeInicio: string | null): Promise<Empresa> {
  const escenario = await prepararEscenario(entorno, clave);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  if (fechaDeInicio) {
    const ruta = `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`;
    const guardada = await escenario.cuenta.propietario.put(ruta, { fechaDeInicio });
    expect(guardada.estado, JSON.stringify(guardada.cuerpo)).toBe(200);
  }
  const operador = await operadorDeLaBandeja(escenario);
  const loteId = await sembrarLote(operador, { emisionDesde: primerDiaDelMes(-4), emisionHasta: HOY });
  return { escenario, operador, loteId };
}

let conInicio: Empresa;
let sinInicio: Empresa;
const ids = {} as Record<'enPlazo' | 'lejos' | 'actual' | 'registrada', string>;

const lista = async (e: Empresa, consulta = '') => {
  const respuesta = await e.escenario.cuenta.propietario.get(`${RUTA_DTE}?${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

const conciliacion = async (e: Empresa) => {
  const respuesta = await e.escenario.cuenta.propietario.get(`${RUTA_DTE}/conciliacion?periodo=${PERIODO_ANTERIOR}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

async function sembrarEn(e: Empresa) {
  const enPlazo = await sembrarFila(e.operador, e.loteId, { fechaEmision: EN_PLAZO });
  const lejos = await sembrarFila(e.operador, e.loteId, { fechaEmision: LEJOS });
  const actual = await sembrarFila(e.operador, e.loteId, { fechaEmision: HOY });
  return { enPlazo, lejos, actual };
}

beforeAll(async () => {
  instalarDestinoFalso();
  conInicio = await empresa('anterioresconinicio', INICIO);
  sinInicio = await empresa('anterioressininicio', null);
  Object.assign(ids, await sembrarEn(conInicio));
  await sembrarEn(sinInicio);
});

afterAll(() => vi.restoreAllMocks());

describe('bandeja: DTE anteriores a la fecha de inicio', () => {
  it('marca las anteriores y destaca las del plazo de crédito', async () => {
    const cuerpo = await lista(conInicio);
    const porId = (id: string) => cuerpo.elementos.find((fila: any) => fila.id === id);

    expect(cuerpo).toMatchObject({ fechaDeInicio: INICIO, anterioresOcultos: 0, total: 3 });
    expect(porId(ids.enPlazo)).toMatchObject({ anteriorALaFechaDeInicio: true, enPlazoDeCredito: true });
    expect(porId(ids.lejos)).toMatchObject({ anteriorALaFechaDeInicio: true, enPlazoDeCredito: false });
    expect(porId(ids.actual)).toMatchObject({ anteriorALaFechaDeInicio: false, enPlazoDeCredito: false });
  });

  it('el filtro ocultar las deja fuera y dice cuántas; solo muestra únicamente esas', async () => {
    const ocultas = await lista(conInicio, 'anteriores=ocultar');
    const solo = await lista(conInicio, 'anteriores=solo');

    expect(ocultas.elementos.map((f: any) => f.id)).toEqual([ids.actual]);
    expect(ocultas.anterioresOcultos).toBe(2);
    expect(solo.total).toBe(2);
    expect(solo.anterioresOcultos).toBe(0);
  });

  it('sin fecha de inicio nada se marca y el filtro no oculta nada', async () => {
    const cuerpo = await lista(sinInicio, 'anteriores=ocultar');

    expect(cuerpo).toMatchObject({ fechaDeInicio: null, anterioresOcultos: 0, total: 3 });
    expect(cuerpo.elementos.every((f: any) => !f.anteriorALaFechaDeInicio && !f.enPlazoDeCredito)).toBe(true);
  });
});

describe('conciliación: DTE anteriores a la fecha de inicio', () => {
  it('la fila anterior sin documento va al grupo informativo, destacada si está en plazo', async () => {
    const cuerpo = await conciliacion(conInicio);

    expect(cuerpo.fechaDeInicio).toBe(INICIO);
    expect(cuerpo.resumen).toMatchObject({ anterioresALaFechaDeInicio: 1, enLaSatYNoEnArrancar: 0 });
    expect(cuerpo.resultados.anterioresALaFechaDeInicio[0]).toMatchObject({
      dteId: ids.enPlazo,
      enPlazoDeCredito: true,
    });
  });

  it('un DTE anterior que sí está registrado en Arrancar se concilia como siempre', async () => {
    const cuerpo: Record<string, any> = documentoDePrueba(conInicio.escenario, {
      fechaEmision: `${PERIODO_ANTERIOR.slice(0, 7)}-12`,
    });
    const registro = await conInicio.escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, cuerpo);
    expect(registro.estado, JSON.stringify(registro.cuerpo)).toBe(201);
    ids.registrada = await sembrarFila(conInicio.operador, conInicio.loteId, {
      nitEmisor: cuerpo.nitEmisor,
      serie: cuerpo.serie,
      numero: cuerpo.numero,
      autorizacionFel: cuerpo.autorizacionFel,
      fechaEmision: cuerpo.fechaEmision,
    });

    const resultado = await conciliacion(conInicio);
    const enGrupo = resultado.resultados.anterioresALaFechaDeInicio.map((i: any) => i.dteId);

    expect(enGrupo).not.toContain(ids.registrada);
    const { anterioresALaFechaDeInicio: _, ...otros } = resultado.resultados;
    const dtes = Object.values(otros).flat() as any[];
    expect(dtes.map((i) => i.dteId)).toContain(ids.registrada);
  });

  it('sin fecha de inicio la fila va a «en la SAT y no en Arrancar» como siempre', async () => {
    const cuerpo = await conciliacion(sinInicio);

    expect(cuerpo.fechaDeInicio).toBeNull();
    expect(cuerpo.resumen).toMatchObject({ anterioresALaFechaDeInicio: 0, enLaSatYNoEnArrancar: 1 });
  });
});
