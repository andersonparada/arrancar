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
  depreciacion: {
    titulo: 'Cierre de depreciación',
    descripcion:
      'Cierre mensual de la depreciación contable y fiscal: se revisa el mes, se cierra y, si hace falta, se reabre.',
  },
  saldosIniciales: {
    titulo: 'Saldos iniciales de activos',
    descripcion: 'Los activos que la empresa ya tenía a la fecha de inicio, con su depreciación acumulada.',
    nuevo: 'Cargar saldo inicial',
    editar: 'Corregir saldo inicial',
  },
  // generador: ventanas
} as const;
