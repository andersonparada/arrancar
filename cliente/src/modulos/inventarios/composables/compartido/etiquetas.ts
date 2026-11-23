import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { TipoDeInventario } from '../../servicios/articulos.api';
import type {
  CausaDeEntrada,
  ClaseDeDocumento,
  DestinoDeSalida,
  EstadoDeDocumento,
} from '../../servicios/documentos.api';
import type { MetodoDeCosteo } from '../../servicios/metodo-de-costeo.api';

/** Cómo se llama cada clase de documento en pantalla. */
export const ETIQUETAS_DE_CLASE: Record<ClaseDeDocumento, string> = {
  entrada_manual: 'Entrada',
  salida_por_consumo: 'Salida',
  recepcion_de_compra: 'Recepción de compra',
  devolucion_a_proveedor: 'Devolución a proveedor',
  rebaja_de_costo: 'Rebaja de costo',
};

export const ETIQUETAS_DE_CAUSA: Record<CausaDeEntrada, string> = {
  produccion_propia: 'Producción propia',
  donacion_recibida: 'Donación recibida',
  aporte: 'Aporte',
  otra: 'Otra causa',
};

export const ETIQUETAS_DE_DESTINO: Record<DestinoDeSalida, string> = {
  gasto: 'Gasto (consumo)',
  obra_de_activo_fijo: 'Obra o uso propio (activo en construcción)',
  mantenimiento_de_activo_fijo: 'Mantenimiento de un activo fijo',
};

export const ETIQUETAS_DE_ESTADO: Record<EstadoDeDocumento, string> = { vigente: 'Vigente', anulado: 'Anulado' };

export const ETIQUETAS_DE_TIPO: Record<TipoDeInventario, string> = {
  mercaderia: 'Mercadería',
  materia_prima: 'Materia prima',
  suministros: 'Suministros',
  producto_en_proceso: 'Producto en proceso',
  producto_terminado: 'Producto terminado',
  repuestos: 'Repuestos',
  empaques: 'Empaques',
};

export const ETIQUETAS_DE_METODO: Record<MetodoDeCosteo, string> = {
  promedio_ponderado: 'Promedio ponderado',
  peps: 'PEPS (primeras entradas, primeras salidas)',
};

export const ETIQUETAS_DE_TIPO_DE_MOVIMIENTO: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  traslado: 'Traslado',
  ajuste_de_valor: 'Ajuste de valor',
};

/** Las opciones de un selector a partir de sus etiquetas, ordenadas por nombre. */
export function opcionesDeEtiquetas<Clave extends string>(
  etiquetas: Record<Clave, string>,
  vacia?: string,
): OpcionDeRegistro[] {
  const opciones = (Object.entries(etiquetas) as [Clave, string][])
    .map(([valor, texto]) => ({ valor: valor as string | null, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return vacia ? [{ valor: null, texto: vacia }, ...opciones] : opciones;
}
