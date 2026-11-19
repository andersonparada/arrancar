import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { ConversionDeArticulo, DatosDeConversiones } from '../../servicios/articulos.api';
import type { Unidad } from '../../servicios/unidades.api';
import { sinCerosFinales } from '../compartido/cantidades';

/** Una fila de la ventana de conversiones: una unidad de empaque y cuántas unidades base trae. */
export interface FilaDeConversion {
  unidadId: string | null;
  factor: string | number;
  paraCompras: boolean;
}

/** La ventana de conversiones del artículo mientras se edita. */
export interface EdicionDeConversiones {
  abierta: boolean;
  filas: FilaDeConversion[];
}

const filaNueva = (): FilaDeConversion => ({ unidadId: null, factor: '', paraCompras: false });

/** La ventana abierta con las conversiones que ya tiene el artículo. */
export const edicionDeConversiones = (conversiones: readonly ConversionDeArticulo[]): EdicionDeConversiones => ({
  abierta: true,
  filas: conversiones.map(({ unidadId, factor, paraCompras }) => ({
    unidadId,
    factor: textoDeEdicion(sinCerosFinales(factor)),
    paraCompras,
  })),
});

export function agregarFila(edicion: EdicionDeConversiones): void {
  edicion.filas.push(filaNueva());
}

export function quitarFila(edicion: EdicionDeConversiones, indice: number): void {
  edicion.filas.splice(indice, 1);
}

/** Solo una conversión es la de compras: marcar una desmarca las demás; volver a marcarla la desmarca. */
export function marcarParaCompras(edicion: EdicionDeConversiones, indice: number): void {
  const yaEra = edicion.filas[indice]?.paraCompras ?? false;
  edicion.filas.forEach((fila, posicion) => (fila.paraCompras = !yaEra && posicion === indice));
}

/** Lo que se manda al servidor: las filas sin unidad (recién agregadas y vacías) se descartan. */
export const datosDeConversiones = (edicion: EdicionDeConversiones): DatosDeConversiones => ({
  conversiones: edicion.filas
    .filter((fila) => fila.unidadId !== null)
    .map((fila) => ({ unidadId: fila.unidadId!, factor: textoDeEdicion(fila.factor), paraCompras: fila.paraCompras })),
});

/**
 * Las unidades que se pueden elegir en una fila: activas y que no estén ya en otra fila (la de la propia fila sigue
 * ofreciéndose para poder verla elegida). `unidades` ya viene sin la unidad base del artículo.
 */
export function unidadesDisponibles(
  unidades: readonly Unidad[],
  edicion: EdicionDeConversiones,
  indice: number,
): Unidad[] {
  const enOtras = new Set(edicion.filas.filter((_, posicion) => posicion !== indice).map((fila) => fila.unidadId));
  return unidades.filter((unidad) => unidad.activo && !enOtras.has(unidad.id));
}
