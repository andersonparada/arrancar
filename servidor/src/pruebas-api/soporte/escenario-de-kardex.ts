import { expect } from 'vitest';
import { crearReferencias, datosDeArticulo, type ReferenciasDeArticulo } from '../inventarios.soporte.js';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';

export interface EscenarioDeKardex {
  cuenta: CuentaDePrueba;
  referencias: ReferenciasDeArticulo;
  bodegaId: string;
  articuloId: string;
}

export interface RenglonDePrueba {
  articuloId: string;
  cantidad: string;
  costoTotal?: string;
  loteId?: string;
  unidadId?: string;
}

let contador = 0;

/** Una cuenta con el módulo, una bodega, un artículo en libras y las referencias para crear más. */
export async function prepararKardex(entorno: EntornoApi, nombre: string): Promise<EscenarioDeKardex> {
  const cuenta = await darDeAltaCuenta(entorno, {
    nombre,
    usuario: `propietario${nombre}`,
    modulos: ['terceros', 'libro-de-compras', 'inventarios'],
  });
  const referencias = await crearReferencias(cuenta.propietario);
  const bodegaId = await crearBodega(cuenta.propietario);
  const articuloId = await crearArticulo(cuenta.propietario, referencias);
  return { cuenta, referencias, bodegaId, articuloId };
}

export async function crearBodega(cliente: ClienteApi): Promise<string> {
  contador += 1;
  const respuesta = await cliente.post('/api/inventarios/bodegas', {
    codigo: `K-${contador}`,
    nombre: `Bodega de kardex ${contador}`,
    localidadId: null,
    responsable: null,
    responsableUsuarioId: null,
    activo: true,
  });
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.id;
}

export async function crearArticulo(
  cliente: ClienteApi,
  referencias: ReferenciasDeArticulo,
  cambios: Record<string, unknown> = {},
): Promise<string> {
  const respuesta = await cliente.post('/api/inventarios/articulos', datosDeArticulo(referencias, cambios));
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.id;
}

/** Una entrada manual de un solo renglón; el costo va en quetzales como texto. */
export function entrada(
  cliente: ClienteApi,
  datos: { bodegaId: string; fecha: string; renglones: RenglonDePrueba[]; causa?: string },
) {
  return cliente.post('/api/inventarios/entradas', {
    fecha: datos.fecha,
    bodegaId: datos.bodegaId,
    causa: datos.causa ?? 'produccion_propia',
    soporte: 'Orden de producción 1',
    observaciones: null,
    renglones: datos.renglones.map((r) => ({ loteId: null, unidadId: null, costoTotal: null, ...r })),
  });
}

/** Una salida a gasto de un solo renglón; el concepto de gasto es el del artículo. */
export function salida(
  cliente: ClienteApi,
  escenario: Pick<EscenarioDeKardex, 'referencias'>,
  datos: { bodegaId: string; fecha: string; renglones: RenglonDePrueba[] },
) {
  return cliente.post('/api/inventarios/salidas', {
    fecha: datos.fecha,
    bodegaId: datos.bodegaId,
    destino: 'gasto',
    conceptoDeGastoId: escenario.referencias.conceptoDeGastoId,
    localidadId: null,
    departamentoId: null,
    entregadoA: 'Pedro',
    observaciones: null,
    renglones: datos.renglones.map((r) => ({ loteId: null, unidadId: null, costoTotal: null, ...r })),
  });
}

export const kardexDe = async (cliente: ClienteApi, articuloId: string, consulta = '') =>
  (await cliente.get(`/api/inventarios/articulos/${articuloId}/kardex${consulta}`)).cuerpo;
