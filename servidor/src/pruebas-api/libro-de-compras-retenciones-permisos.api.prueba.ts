import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  MES_DE_HOY,
  prepararRetenciones,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
const ID = '00000000-0000-4000-8000-000000000001';
const MES = MES_DE_HOY.slice(0, 7);
let e: EscenarioDeRetenciones;
let soloVer: ClienteApi;
let exportador: ClienteApi;
let anotador: ClienteApi;
let enterador: ClienteApi;

const PREFIJO = 'libro-de-compras.retenciones';
const usuario = (nombres: string, permisos: string[]) =>
  crearUsuarioConPermisos(entorno, e.escenario.cuenta, { nombres, apellidos: 'Retenciones', permisos });

/** Cada acción de la API con el cliente que la intenta: devuelve solo el estado. */
const acciones = (cliente: ClienteApi) => ({
  reporte: async () => (await cliente.get(`${RUTA_RETENCIONES}?mes=${MES}`)).estado,
  porResolver: async () => (await cliente.get(`${RUTA_RETENCIONES}/por-resolver`)).estado,
  matriz: async () => (await cliente.get(`${RUTA_RETENCIONES}/enteros?anio=${HOY.slice(0, 4)}`)).estado,
  excel: async () => (await cliente.get(`${RUTA_RETENCIONES}/exportar?mes=${MES}`)).estado,
  anotar: async () => (await cliente.put(`${RUTA_RETENCIONES}/${ID}/constancia`, { numero: 'C1', fecha: HOY })).estado,
  lote: async () =>
    (
      await cliente.post(`${RUTA_RETENCIONES}/constancias`, {
        constancias: [{ retencionId: ID, numero: 'C', fecha: HOY }],
      })
    ).estado,
  quitar: async () => (await cliente.delete(`${RUTA_RETENCIONES}/${ID}/constancia`, { motivo: 'x' })).estado,
  resolver: async () => (await cliente.put(`${RUTA_RETENCIONES}/${ID}/resolucion`, { resolucion: 'pendiente' })).estado,
  enterar: async () =>
    (
      await cliente.post(`${RUTA_RETENCIONES}/enteros`, {
        mes: MES,
        grupo: 'iva_agentes',
        fechaDePago: HOY,
        documentoDePago: 'F1',
        monto: '1.00',
      })
    ).estado,
  corregir: async () =>
    (
      await cliente.put(`${RUTA_RETENCIONES}/enteros/${ID}`, {
        fechaDePago: HOY,
        documentoDePago: 'F1',
        monto: '1.00',
      })
    ).estado,
  anularEntero: async () => (await cliente.post(`${RUTA_RETENCIONES}/enteros/${ID}/anular`, { motivo: 'x' })).estado,
});

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionespermisos');
  soloVer = await usuario('Solo ver', [`${PREFIJO}.ver`]);
  exportador = await usuario('Exportador', [`${PREFIJO}.exportar`]);
  anotador = await usuario('Anotador', [`${PREFIJO}.constancias`]);
  enterador = await usuario('Enterador', [`${PREFIJO}.enterar`]);
});

afterAll(() => vi.restoreAllMocks());

describe('permisos de las rutas de retenciones', () => {
  it('sin sesión responde 401', async () => {
    const sinSesion = entorno.nuevoCliente();

    expect(await acciones(sinSesion).reporte()).toBe(401);
    expect(await acciones(sinSesion).enterar()).toBe(401);
  });

  it('ver da el reporte, lo por resolver y la matriz, y nada más', async () => {
    const a = acciones(soloVer);

    expect([await a.reporte(), await a.porResolver(), await a.matriz()]).toEqual([200, 200, 200]);
    const prohibidas = [a.excel, a.anotar, a.lote, a.quitar, a.resolver, a.enterar, a.corregir, a.anularEntero];
    for (const accion of prohibidas) expect(await accion()).toBe(403);
  });

  it('exportar solo baja el Excel: ver una lista no da derecho a llevársela', async () => {
    const a = acciones(exportador);

    expect(await a.excel()).toBe(200);
    expect(await a.reporte()).toBe(403);
    expect(await a.anotar()).toBe(403);
  });

  it('constancias anota, quita y resuelve, pero no enteros ni reporte', async () => {
    const a = acciones(anotador);

    // Pasan los permisos: la retención de prueba no existe y responde 404 (o 400 por el cuerpo).
    expect([await a.anotar(), await a.quitar(), await a.resolver()]).toEqual([404, 404, 404]);
    expect(await a.lote()).toBe(400);
    for (const accion of [a.enterar, a.corregir, a.anularEntero, a.reporte]) expect(await accion()).toBe(403);
  });

  it('enterar marca, corrige y anula pagos, pero no anota constancias', async () => {
    const a = acciones(enterador);

    expect(await a.enterar()).toBe(422);
    expect([await a.corregir(), await a.anularEntero()]).toEqual([404, 404]);
    for (const accion of [a.anotar, a.lote, a.resolver, a.reporte]) expect(await accion()).toBe(403);
  });

  it('el propietario de la cuenta, con acceso total, puede todo', async () => {
    const a = acciones(e.propietario);

    expect([await a.reporte(), await a.excel(), await a.matriz()]).toEqual([200, 200, 200]);
    expect(await a.anotar()).toBe(404);
  });
});
