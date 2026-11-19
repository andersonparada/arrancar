import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

type Opciones = () => Promise<OpcionDeReferencia[]>;

const TIPOS_DE_INVENTARIO = {
  mercaderia: 'Mercadería',
  materia_prima: 'Materia prima',
  suministros: 'Suministros',
  producto_en_proceso: 'Producto en proceso',
  producto_terminado: 'Producto terminado',
  repuestos: 'Repuestos',
  empaques: 'Empaques',
};

interface ColumnaPorNombre {
  clave: string;
  titulo: string;
  requerido: boolean;
}

/** Una columna que se llena con el nombre de otro registro (categoría, unidad, concepto de gasto). */
const porNombre = ({ clave, titulo, requerido }: ColumnaPorNombre, opciones: Opciones): Columna => ({
  clave,
  titulo,
  requerido,
  tipo: 'referencia',
  campoDeNombre: clave.replace(/Id$/, 'Nombre'),
  opciones,
});

/** Las columnas del Excel de los artículos: los mismos datos del formulario, en el mismo orden. */
export const columnasDeArticulos = (
  opciones: Record<'categoriaId' | 'unidadBaseId' | 'conceptoDeGastoId', Opciones>,
): Columna[] => [
  { clave: 'codigo', titulo: 'Código', requerido: true, tipo: 'texto' },
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'descripcion', titulo: 'Descripción', requerido: false, tipo: 'texto' },
  porNombre({ clave: 'categoriaId', titulo: 'Categoría', requerido: true }, opciones.categoriaId),
  {
    clave: 'tipoDeInventario',
    titulo: 'Tipo de inventario',
    requerido: true,
    tipo: 'lista',
    opciones: TIPOS_DE_INVENTARIO,
  },
  porNombre({ clave: 'unidadBaseId', titulo: 'Unidad base', requerido: true }, opciones.unidadBaseId),
  { clave: 'manejaLotes', titulo: 'Maneja lotes', requerido: true, tipo: 'siNo' },
  { clave: 'manejaVencimiento', titulo: 'Maneja vencimiento', requerido: true, tipo: 'siNo' },
  { clave: 'codigoDeBarras', titulo: 'Código de barras', requerido: false, tipo: 'texto' },
  porNombre({ clave: 'conceptoDeGastoId', titulo: 'Concepto de gasto', requerido: false }, opciones.conceptoDeGastoId),
  { clave: 'existenciaMinima', titulo: 'Existencia mínima', requerido: false, tipo: 'decimal' },
  { clave: 'pesoKgPorUnidadBase', titulo: 'Peso en kg por unidad base', requerido: false, tipo: 'decimal' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
