import { definirRecurso, lista, texto } from '../../src/definicion/indice.js';

/**
 * Categoría de artículos de Inventarios (INV-1, `docs/modulos/diseno-inventarios.md` §5.2): un solo nivel; propone
 * el tipo de inventario de sus artículos. Se inactiva con auditoría; solo se elimina sin artículos (a mano).
 * Genere su código con:
 *   npm run generar -- recurso inventarios/categoria
 */
export const recurso = definirRecurso({
  modulo: 'inventarios',
  entidad: 'Categoria',
  plural: 'Categorias',
  textos: { singular: 'categoría', plural: 'categorías' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Boxes',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 80 }),
    tipoDeInventarioPorOmision: lista(
      {
        mercaderia: 'Mercadería',
        materia_prima: 'Materia prima',
        suministros: 'Suministros',
        producto_en_proceso: 'Producto en proceso',
        producto_terminado: 'Producto terminado',
        repuestos: 'Repuestos',
        empaques: 'Empaques',
      },
      { requerido: true, etiqueta: 'Tipo de inventario por omisión' },
    ),
  },
});
