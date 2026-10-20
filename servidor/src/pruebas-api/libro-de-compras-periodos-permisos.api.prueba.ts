import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import {
  apagarElBloqueo,
  declarar,
  encenderElBloqueo,
  fechasDe,
  mesDe,
  reabrir,
  RUTA_PERIODOS,
} from './soporte/escenario-de-periodos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const PREFIJO = 'libro-de-compras.periodos';
let escenario: EscenarioDeDocumentos;
let soloVer: ClienteApi;
let declarador: ClienteApi;
let reabridor: ClienteApi;

const usuario = (nombres: string, permisos: string[]) =>
  crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Períodos', permisos });

/** Cada acción de la API con el cliente que la intenta: devuelve solo el estado. */
const acciones = (cliente: ClienteApi, periodo: string) => ({
  lista: async () => (await cliente.get(RUTA_PERIODOS)).estado,
  detalle: async () => (await cliente.get(`${RUTA_PERIODOS}/${periodo.slice(0, 7)}`)).estado,
  declarar: async () => (await declarar(cliente, periodo)).estado,
  reabrir: async () => (await reabrir(cliente, periodo)).estado,
  encender: async () => (await encenderElBloqueo(cliente)).estado,
  apagar: async () => (await apagarElBloqueo(cliente, 'Motivo')).estado,
});

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'periodospermisos');
  soloVer = await usuario('Mirón', [`${PREFIJO}.ver`]);
  declarador = await usuario('Declarador', [`${PREFIJO}.ver`, `${PREFIJO}.declarar`]);
  reabridor = await usuario('Reabridor', [`${PREFIJO}.ver`, `${PREFIJO}.reabrir`]);
});

afterAll(() => vi.restoreAllMocks());

describe('permisos de los períodos', () => {
  const P = mesDe(-2);

  it('quien solo puede ver mira la lista y el detalle y no cambia nada', async () => {
    const a = acciones(soloVer, P);

    expect([await a.lista(), await a.detalle()]).toEqual([200, 200]);
    expect([await a.declarar(), await a.reabrir(), await a.encender(), await a.apagar()]).toEqual([403, 403, 403, 403]);
  });

  it('quien puede declarar declara y enciende el bloqueo, pero no reabre ni lo apaga', async () => {
    const a = acciones(declarador, P);

    expect([await a.declarar(), await a.encender()]).toEqual([200, 200]);
    expect([await a.reabrir(), await a.apagar()]).toEqual([403, 403]);
  });

  it('quien puede reabrir reabre y apaga el bloqueo, pero no declara ni lo enciende', async () => {
    const a = acciones(reabridor, P);

    expect([await a.reabrir(), await a.apagar()]).toEqual([200, 200]);
    expect([await a.declarar(), await a.encender()]).toEqual([403, 403]);
  });

  it('sin ninguno de los permisos ni siquiera ve la lista', async () => {
    const sinNada = await usuario('Sin permisos', ['libro-de-compras.libro.ver']);

    expect(await acciones(sinNada, P).lista()).toBe(403);
  });
});

describe('cuando todos los meses del plazo están declarados', () => {
  const R = mesDe(-5);

  it('propone el primer mes abierto, fuera del plazo del art. 20, y avisa que el IVA irá al costo', async () => {
    const propietario = escenario.cuenta.propietario;
    for (const meses of [-5, -4, -3]) expect((await declarar(propietario, mesDe(meses))).estado).toBe(200);
    expect((await encenderElBloqueo(propietario)).estado).toBe(200);
    const cuerpo = documentoDePrueba(escenario, fechasDe(R));

    const rechazada = await propietario.post(RUTA_DOCUMENTOS, { ...cuerpo, periodo: R });
    const propuesta = await propietario.post(RUTA_DOCUMENTOS, cuerpo);

    expect(rechazada.estado).toBe(409);
    expect(rechazada.cuerpo.error.detalles).toMatchObject({ periodoPropuesto: mesDe(-2), propuestaEnPlazo: false });
    expect(propuesta.estado, JSON.stringify(propuesta.cuerpo)).toBe(201);
    expect(propuesta.cuerpo.documento).toMatchObject({ periodo: mesDe(-2), motivoSinCredito: 'fuera_de_plazo' });
    expect(propuesta.cuerpo.avisos.join(' ')).toContain('Ahí pierde el crédito (art. 20)');
  });
});
