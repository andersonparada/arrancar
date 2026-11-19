import { decimal, definirRecurso, lista, referencia, siNo, texto, textoLargo } from '../../src/definicion/indice.js';

/**
 * Artículo de Inventarios (INV-1, `docs/modulos/diseno-inventarios.md` §5.3). Las conversiones, los lotes y el
 * concepto de gasto (de Libro de compras) se agregan a mano sobre lo generado. Se inactiva con auditoría (no con
 * existencias); solo se elimina sin movimientos. Genere su código con:
 *   npm run generar -- recurso inventarios/articulo
 */
export const recurso = definirRecurso({
  modulo: 'inventarios',
  entidad: 'Articulo',
  plural: 'Articulos',
  textos: { singular: 'artículo', plural: 'artículos' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'completa',
  seccion: 'administracion',
  icono: 'Package',
  baja: 'inactivar',
  campos: {
    codigo: texto({ requerido: true, unico: true, largoMaximo: 30, etiqueta: 'Código' }),
    nombre: texto({ requerido: true, unico: true, largoMaximo: 150 }),
    descripcion: textoLargo({ etiqueta: 'Descripción' }),
    categoria: referencia('Categoria', { requerido: true, etiqueta: 'Categoría' }),
    tipoDeInventario: lista(
      {
        mercaderia: 'Mercadería',
        materia_prima: 'Materia prima',
        suministros: 'Suministros',
        producto_en_proceso: 'Producto en proceso',
        producto_terminado: 'Producto terminado',
        repuestos: 'Repuestos',
        empaques: 'Empaques',
      },
      { requerido: true, etiqueta: 'Tipo de inventario' },
    ),
    unidadBase: referencia('Unidad', { requerido: true, etiqueta: 'Unidad base' }),
    manejaLotes: siNo({ etiqueta: 'Maneja lotes' }),
    manejaVencimiento: siNo({ etiqueta: 'Maneja vencimiento' }),
    codigoDeBarras: texto({ unico: true, largoMaximo: 60, etiqueta: 'Código de barras' }),
    existenciaMinima: decimal({ decimales: 4, etiqueta: 'Existencia mínima' }),
    pesoKgPorUnidadBase: decimal({ decimales: 4, etiqueta: 'Peso en kg por unidad base' }),
  },
});
