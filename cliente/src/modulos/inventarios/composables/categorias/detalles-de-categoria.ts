import { formatearOpcion } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_TIPO_DE_INVENTARIO_POR_OMISION } from './edicion-de-categoria';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Categoria } from '../../servicios/categorias.api';

/** Lo que muestra la tarjeta de la categoría además de nombre, ya con formato. */
export const detallesDeCategoria = (registro: Categoria): DetalleDeRegistro[] => [
  {
    etiqueta: 'Tipo de inventario por omisión',
    valor: formatearOpcion(OPCIONES_DE_TIPO_DE_INVENTARIO_POR_OMISION, registro.tipoDeInventarioPorOmision),
  },
];
