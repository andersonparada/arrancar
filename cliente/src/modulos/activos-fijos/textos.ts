/** Nombres de las ventanas y del menú del módulo Activos fijos. */

export const NOMBRE_ACTIVOS_FIJOS = 'Activos fijos';

export const VENTANAS_ACTIVOS_FIJOS = {
  clases: {
    titulo: 'Clases de activos',
    descripcion: 'Las clases de activos de la empresa.',
    nuevo: 'Nueva clase de activo',
    editar: 'Editar clase de activo',
  },
  activos: {
    titulo: 'Activos fijos',
    descripcion: 'Los bienes de la empresa: activos fijos, bienes de control y bienes de terceros.',
    nuevo: 'Nuevo activo',
    ficha: 'Ficha del activo',
  },
  porCapitalizar: {
    titulo: 'Por capitalizar',
    descripcion:
      'Las compras marcadas como activo fijo en el libro de compras, listas para convertirse en costo de un activo.',
  },
  // generador: ventanas
} as const;
