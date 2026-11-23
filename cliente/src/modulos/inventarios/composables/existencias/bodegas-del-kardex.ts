import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Existencia } from '../../servicios/existencias.api';

interface BodegaVisible {
  id: string;
  nombre: string;
  activo: boolean;
}

/**
 * Las bodegas que ofrece el kardex. Quien ve todas puede pedir «Toda la empresa»; los demás deben elegir una bodega
 * suya: el servidor no les da el kardex de la empresa entera.
 */
export function opcionesDeBodegasDelKardex(bodegas: BodegaVisible[], veTodas: boolean): OpcionDeRegistro[] {
  const opciones = bodegas
    .map((bodega) => ({
      valor: bodega.id as string | null,
      texto: bodega.activo ? bodega.nombre : `${bodega.nombre} (inactiva)`,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return veTodas ? [{ valor: null, texto: 'Toda la empresa' }, ...opciones] : opciones;
}

/** La bodega con la que abre el kardex: ninguna (toda la empresa) para quien las ve todas; la primera por nombre si no. */
export function bodegaPorOmision(bodegas: BodegaVisible[], veTodas: boolean): string | null {
  if (veTodas) return null;
  return opcionesDeBodegasDelKardex(bodegas, false)[0]?.valor ?? null;
}

/** ¿Se puede pedir el kardex con esta elección? Sin ver todas las bodegas hace falta elegir una. */
export const puedePedirElKardex = (bodegaId: string | null, veTodas: boolean): boolean => veTodas || bodegaId !== null;

/**
 * Las bodegas que se ven en las existencias del artículo, sin repetir. Sirven cuando el usuario no puede listar las
 * bodegas (no tiene `bodegas.ver`) pero sí ve lo que hay en ellas: el servidor ya recortó las existencias a su alcance.
 */
export function bodegasDeLasExistencias(existencias: Existencia[]): BodegaVisible[] {
  const vistas = new Map<string, BodegaVisible>();
  for (const existencia of existencias) {
    vistas.set(existencia.bodegaId, { id: existencia.bodegaId, nombre: existencia.bodegaNombre, activo: true });
  }
  return [...vistas.values()];
}
