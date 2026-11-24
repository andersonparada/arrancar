import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { crearArticulo, crearBodega, prepararKardex, type EscenarioDeKardex } from './escenario-de-kardex.js';
import { fijarFechaDeInicio } from './escenario-de-saldos-de-activos.js';

export const SALDOS_DE_INVENTARIO = '/api/inventarios/saldos-iniciales';
export const METODO = '/api/inventarios/metodo-de-costeo';

/** Una cuenta con inventarios, la fecha de inicio puesta y, si se pide, el método de costeo ya elegido. */
export async function prepararSaldos(
  entorno: EntornoApi,
  nombre: string,
  opciones: { inicio?: string; metodo?: 'peps' | 'promedio_ponderado' } = {},
): Promise<EscenarioDeKardex> {
  const e = await prepararKardex(entorno, nombre);
  const fecha = await fijarFechaDeInicio(e.cuenta, opciones.inicio ?? '2026-09-01');
  expect(fecha.estado, JSON.stringify(fecha.cuerpo)).toBe(200);
  if (opciones.metodo) {
    expect((await e.cuenta.propietario.post(METODO, { metodo: opciones.metodo })).estado).toBe(200);
  }
  return e;
}

/** Lo que se manda para un renglón de saldo inicial; el costo va en quetzales como texto. */
export const datosDeSaldoInicial = (
  e: Pick<EscenarioDeKardex, 'articuloId' | 'bodegaId'>,
  cantidad: string,
  costoTotal: string,
) => ({
  articuloId: e.articuloId,
  bodegaId: e.bodegaId,
  loteId: null,
  loteCodigo: null,
  loteVencimiento: null,
  cantidad,
  unidadId: null,
  costoTotal,
  fechaDeCapa: null,
});

/** Carga un renglón y exige que se cree (201). */
export async function cargarSaldoInicial(cliente: ClienteApi, datos: Record<string, unknown>) {
  const respuesta = await cliente.post(SALDOS_DE_INVENTARIO, datos);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

export { crearArticulo, crearBodega };
