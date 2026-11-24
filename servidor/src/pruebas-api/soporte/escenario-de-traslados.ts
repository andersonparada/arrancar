import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import type { EscenarioDeKardex, RenglonDePrueba } from './escenario-de-kardex.js';

const VARIABLE_DE_TRANSITO = 'inventarios.traslados.con_transito';

/** Un traslado de un solo renglón; sin `fecha`, el de la prueba. */
export function trasladar(
  cliente: ClienteApi,
  datos: { origen: string; destino: string; renglones: RenglonDePrueba[]; fecha?: string; entregadoA?: string },
) {
  return cliente.post('/api/inventarios/traslados', {
    fecha: datos.fecha ?? '2026-07-10',
    bodegaDeOrigenId: datos.origen,
    bodegaDeDestinoId: datos.destino,
    entregadoA: datos.entregadoA ?? 'Pedro',
    observaciones: null,
    renglones: datos.renglones.map((r) => ({ loteId: null, unidadId: null, costoTotal: null, ...r })),
  });
}

export const recibir = (cliente: ClienteApi, documentoId: string, cuerpo: Record<string, unknown> = {}) =>
  cliente.post(`/api/inventarios/traslados/${documentoId}/recibir`, { observaciones: null, ...cuerpo });

export const anularTraslado = (cliente: ClienteApi, documentoId: string) =>
  cliente.post(`/api/inventarios/traslados/${documentoId}/anular`, { motivo: 'Se envió por error' });

/** Las existencias del artículo por bodega, como las ve `cliente`, en un mapa bodega → cantidad. */
export async function existenciasPorBodega(cliente: ClienteApi, articuloId: string): Promise<Record<string, string>> {
  const filas = (await cliente.get(`/api/inventarios/existencias?articuloId=${articuloId}`)).cuerpo as Array<{
    bodegaId: string;
    cantidad: string;
  }>;
  return Object.fromEntries(filas.map((fila) => [fila.bodegaId, fila.cantidad]));
}

/** Activa o desactiva el tránsito en los traslados de la empresa del escenario (solo lo hace el soporte). */
export async function fijarTransito(entorno: EntornoApi, e: EscenarioDeKardex, activo: boolean): Promise<void> {
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.cuenta.empresaId });
  const ruta = `/api/configuracion/${VARIABLE_DE_TRANSITO}`;
  if (activo) expect((await entorno.soporte.put(ruta, { nivel: 'empresa', valor: true })).estado).toBe(204);
  else await entorno.soporte.delete(`${ruta}?nivel=empresa`);
}
