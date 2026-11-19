/** Nombres de las ventanas y del menú del módulo Cuentas por liquidar. */

export const NOMBRE_CUENTAS_POR_LIQUIDAR = 'Cuentas por liquidar';

export const VENTANAS_CUENTAS_POR_LIQUIDAR = {
  anticiposPorLiquidar: {
    titulo: 'Anticipos por liquidar',
    descripcion: 'Lo que cada beneficiario debía justificar a una fecha de corte, con su antigüedad y los vencidos.',
  },
  noLiquidado: {
    titulo: 'Lo no liquidado',
    descripcion:
      'Lo que se dejó sin liquidar en un período, por destino: cobrar en cuotas, renta del trabajo o pérdida.',
  },
  // generador: ventanas
} as const;
