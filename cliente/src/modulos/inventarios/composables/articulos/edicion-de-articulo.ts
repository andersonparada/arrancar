import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosArticulo, Articulo, TipoDeInventario } from '../../servicios/articulos.api';

export const OPCIONES_DE_TIPO_DE_INVENTARIO = {
  mercaderia: 'Mercadería',
  materia_prima: 'Materia prima',
  suministros: 'Suministros',
  producto_en_proceso: 'Producto en proceso',
  producto_terminado: 'Producto terminado',
  repuestos: 'Repuestos',
  empaques: 'Empaques',
};

/** Lo que muestra cada campo del formulario mientras se edita un artículo. */
export interface EdicionDeArticulo {
  abierta: boolean;
  id: string | null;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: string | null;
  tipoDeInventario: TipoDeInventario;
  unidadBaseId: string | null;
  manejaLotes: boolean;
  manejaVencimiento: boolean;
  codigoDeBarras: string;
  conceptoDeGastoId: string | null;
  existenciaMinima: string | number;
  pesoKgPorUnidadBase: string | number;
  activo: boolean;
}

const ARTICULO_NUEVO: Omit<EdicionDeArticulo, 'abierta' | 'id'> = {
  codigo: '',
  nombre: '',
  descripcion: '',
  categoriaId: null,
  tipoDeInventario: 'mercaderia',
  unidadBaseId: null,
  manejaLotes: false,
  manejaVencimiento: false,
  codigoDeBarras: '',
  conceptoDeGastoId: null,
  existenciaMinima: '',
  pesoKgPorUnidadBase: '',
  activo: true,
};

/** El formulario abierto con los datos del artículo, o vacío si es nuevo. */
export function edicionDe(articulo?: Articulo): EdicionDeArticulo {
  if (!articulo) return { abierta: true, id: null, ...ARTICULO_NUEVO };
  return {
    abierta: true,
    id: articulo.id,
    codigo: textoDeEdicion(articulo.codigo),
    nombre: textoDeEdicion(articulo.nombre),
    descripcion: textoDeEdicion(articulo.descripcion),
    categoriaId: articulo.categoriaId,
    tipoDeInventario: articulo.tipoDeInventario,
    unidadBaseId: articulo.unidadBaseId,
    manejaLotes: articulo.manejaLotes,
    manejaVencimiento: articulo.manejaVencimiento,
    codigoDeBarras: textoDeEdicion(articulo.codigoDeBarras),
    conceptoDeGastoId: articulo.conceptoDeGastoId,
    existenciaMinima: textoDeEdicion(articulo.existenciaMinima),
    pesoKgPorUnidadBase: textoDeEdicion(articulo.pesoKgPorUnidadBase),
    activo: articulo.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null`. */
export const datosDeArticulo = (edicion: EdicionDeArticulo): DatosArticulo => ({
  codigo: edicion.codigo,
  nombre: edicion.nombre,
  descripcion: textoONulo(edicion.descripcion),
  categoriaId: edicion.categoriaId ?? '',
  tipoDeInventario: edicion.tipoDeInventario,
  unidadBaseId: edicion.unidadBaseId ?? '',
  manejaLotes: edicion.manejaLotes,
  manejaVencimiento: edicion.manejaVencimiento,
  codigoDeBarras: textoONulo(edicion.codigoDeBarras),
  conceptoDeGastoId: edicion.conceptoDeGastoId,
  existenciaMinima: textoONulo(edicion.existenciaMinima),
  pesoKgPorUnidadBase: textoONulo(edicion.pesoKgPorUnidadBase),
  activo: edicion.activo,
});
