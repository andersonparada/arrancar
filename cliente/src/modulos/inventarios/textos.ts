/** Nombres de las ventanas y del menú del módulo Inventarios. */

export const NOMBRE_INVENTARIOS = 'Inventarios';

export const VENTANAS_INVENTARIOS = {
  unidades: {
    titulo: 'Unidades de medida',
    descripcion: 'Las unidades de medida de la empresa.',
    nuevo: 'Nueva unidad de medida',
    editar: 'Editar unidad de medida',
  },
  categorias: {
    titulo: 'Categorías',
    descripcion: 'Las categorías de la empresa.',
    nuevo: 'Nueva categoría',
    editar: 'Editar categoría',
  },
  articulos: {
    titulo: 'Artículos',
    descripcion: 'Los artículos de la empresa.',
    nuevo: 'Nuevo artículo',
    editar: 'Editar artículo',
  },
  bodegas: {
    titulo: 'Bodegas',
    descripcion: 'Las bodegas de la empresa.',
    nuevo: 'Nueva bodega',
    editar: 'Editar bodega',
  },
  existencias: {
    titulo: 'Existencias',
    descripcion: 'Lo que hay de cada artículo, por bodega.',
  },
  movimientos: {
    titulo: 'Movimientos',
    descripcion: 'Entradas, salidas, recepciones y devoluciones del inventario.',
  },
  entrada: {
    titulo: 'Nueva entrada',
    descripcion: 'Mercadería que entra sin pasar por una compra: producción propia, donación o aporte.',
  },
  salida: {
    titulo: 'Nueva salida',
    descripcion: 'Mercadería que sale de una bodega para consumirse como gasto.',
  },
  politicaDeCosteo: {
    titulo: 'Política de costeo',
    descripcion: 'Cómo se calcula el costo de lo que sale del inventario.',
  },
  porRecibir: {
    titulo: 'Por recibir',
    descripcion: 'Compras del Libro de compras que todavía no han entrado a una bodega.',
  },
  // generador: ventanas
} as const;

/** Lo que se le dice a quien va a descartar una línea (V-8): el efecto en el libro y qué hacer con un bien de uso. */
export const AVISO_DE_DESCARTE =
  'La línea dejará de ser inventario en el Libro de compras y volverá a ser gasto con su concepto. Si en realidad es un bien de uso, la marca de activo fijo no se pone desde aquí: se corrige en el libro (anular y registrar de nuevo, si importa la casilla del SAT-2237). Úsela también si la línea ya estaba en el saldo inicial.';
