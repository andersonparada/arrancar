/** Nombres de las ventanas y del menú del módulo Parcelas. */

export const NOMBRE_PARCELAS = 'Parcelas';

export const VENTANAS_PARCELAS = {
  tiposDeParcela: {
    titulo: 'Tipos de parcela',
    descripcion: 'Los tipos de parcela de la empresa.',
    nuevo: 'Nuevo tipo de parcela',
    editar: 'Editar tipo de parcela',
  },
  parcelas: {
    titulo: 'Parcelas',
    descripcion: 'Las fincas, potreros y lotes de la empresa, en árbol por localidad.',
    nuevo: 'Nueva parcela',
    editar: 'Editar parcela',
  },
  // generador: ventanas
} as const;
