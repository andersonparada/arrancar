import { beforeAll, describe, expect, it } from 'vitest';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpqa', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
});

describe('hallazgos del QA en el navegador (2026-11-01)', () => {
  /** Autorizar algo ya autorizado (otra pestaña, otro usuario) debe decir eso, no que falta completarlo. */
  it.fails('autorizar un documento que ya está autorizado dice que ya está autorizado', async () => {
    const propietario = escenario.cuenta.propietario;
    const libroId = await documentos.registrar();
    const id = (await documentos.fila(libroId))!.id;
    expect((await propietario.post(`${RUTA}/registrar`, { documentos: [{ id }] })).estado).toBe(200);
    expect((await propietario.post(`${RUTA}/autorizar`, { ids: [id] })).estado).toBe(200);

    const otraVez = await propietario.post(`${RUTA}/autorizar`, { ids: [id] });

    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.mensaje).toMatch(/ya está autorizado/i);
  });
});
