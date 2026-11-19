import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosCategoria, Categoria } from '../../servicios/categorias.api';

export const OPCIONES_DE_TIPO_DE_INVENTARIO_POR_OMISION = {
  mercaderia: 'Mercadería',
  materia_prima: 'Materia prima',
  suministros: 'Suministros',
  producto_en_proceso: 'Producto en proceso',
  producto_terminado: 'Producto terminado',
  repuestos: 'Repuestos',
  empaques: 'Empaques',
};

/** Lo que muestra cada campo de la ventana mientras se edita una categoría. */
export interface EdicionDeCategoria {
  abierta: boolean;
  id: string | null;
  nombre: string;
  tipoDeInventarioPorOmision:
    | 'mercaderia'
    | 'materia_prima'
    | 'suministros'
    | 'producto_en_proceso'
    | 'producto_terminado'
    | 'repuestos'
    | 'empaques';
  activo: boolean;
}

const CATEGORIA_NUEVO: Omit<EdicionDeCategoria, 'abierta' | 'id'> = {
  nombre: '',
  tipoDeInventarioPorOmision: 'mercaderia',
  activo: true,
};

/** La ventana abierta con los datos de la categoría, o vacía si es nuevo. */
export function edicionDe(categoria?: Categoria): EdicionDeCategoria {
  if (!categoria) return { abierta: true, id: null, ...CATEGORIA_NUEVO };
  return {
    abierta: true,
    id: categoria.id,
    nombre: textoDeEdicion(categoria.nombre),
    tipoDeInventarioPorOmision: categoria.tipoDeInventarioPorOmision,
    activo: categoria.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeCategoria = (edicion: EdicionDeCategoria): DatosCategoria => ({
  nombre: edicion.nombre,
  tipoDeInventarioPorOmision: edicion.tipoDeInventarioPorOmision,
  activo: edicion.activo,
});
