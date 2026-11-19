import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las categorías: los mismos datos del formulario, en el mismo orden. */
export const columnasDeCategorias = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'tipoDeInventarioPorOmision',
    titulo: 'Tipo de inventario por omisión',
    requerido: true,
    tipo: 'lista',
    opciones: {
      mercaderia: 'Mercadería',
      materia_prima: 'Materia prima',
      suministros: 'Suministros',
      producto_en_proceso: 'Producto en proceso',
      producto_terminado: 'Producto terminado',
      repuestos: 'Repuestos',
      empaques: 'Empaques',
    },
  },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
