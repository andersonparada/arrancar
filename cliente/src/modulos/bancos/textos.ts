/** Nombres de las ventanas y del menú del módulo Bancos. */

export const NOMBRE_BANCOS = 'Bancos';

export const VENTANAS_BANCOS = {
  bancos: {
    titulo: 'Bancos',
    descripcion: 'Los bancos de la empresa.',
    nuevo: 'Nuevo banco',
    editar: 'Editar banco',
  },
  cuentasBancarias: {
    titulo: 'Cuentas bancarias',
    descripcion: 'Las cuentas bancarias de la empresa.',
    nuevo: 'Nueva cuenta bancaria',
    editar: 'Editar cuenta bancaria',
  },
  movimientos: {
    titulo: 'Movimientos',
    descripcion: 'Los movimientos de la empresa.',
    nuevo: 'Nuevo movimiento',
    editar: 'Editar movimiento',
  },
  conciliaciones: {
    titulo: 'Conciliaciones',
    descripcion: 'Conciliación mensual de cada cuenta con su estado de cuenta.',
    nuevo: 'Nueva conciliación',
    editar: 'Conciliar',
  },
  // generador: ventanas
} as const;
