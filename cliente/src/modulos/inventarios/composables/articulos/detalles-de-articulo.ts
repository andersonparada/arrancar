import { formatearCantidad, formatearOpcion, formatearSiNo, formatearTexto } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO_DE_INVENTARIO } from './edicion-de-articulo';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Articulo } from '../../servicios/articulos.api';

/** Lo que muestra la tarjeta del artículo además de código, ya con formato. */
export const detallesDeArticulo = (registro: Articulo): DetalleDeRegistro[] => [
  { etiqueta: 'Nombre', valor: formatearTexto(registro.nombre) },
  { etiqueta: 'Categoría', valor: formatearTexto(registro.categoriaNombre) },
  { etiqueta: 'Tipo de inventario', valor: formatearOpcion(OPCIONES_DE_TIPO_DE_INVENTARIO, registro.tipoDeInventario) },
  { etiqueta: 'Unidad base', valor: formatearTexto(registro.unidadBaseNombre) },
  { etiqueta: 'Maneja lotes', valor: formatearSiNo(registro.manejaLotes) },
  { etiqueta: 'Maneja vencimiento', valor: formatearSiNo(registro.manejaVencimiento) },
  { etiqueta: 'Código de barras', valor: formatearTexto(registro.codigoDeBarras) },
  { etiqueta: 'Concepto de gasto', valor: formatearTexto(registro.conceptoDeGastoNombre) },
  { etiqueta: 'Existencia mínima', valor: formatearCantidad(registro.existenciaMinima) },
  { etiqueta: 'Peso en kg por unidad base', valor: formatearCantidad(registro.pesoKgPorUnidadBase) },
  { etiqueta: 'Descripción', valor: formatearTexto(registro.descripcion), largo: true },
];
