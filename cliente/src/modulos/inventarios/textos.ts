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
  // generador: ventanas
} as const;
