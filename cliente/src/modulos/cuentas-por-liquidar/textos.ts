/** Nombres de las ventanas y del menú del módulo Cuentas por liquidar. */

export const NOMBRE_CUENTAS_POR_LIQUIDAR = 'Cuentas por liquidar';

export const VENTANAS_CUENTAS_POR_LIQUIDAR = {
  anticipos: {
    titulo: 'Anticipos',
    descripcion:
      'El dinero que la empresa entregó a una persona para gastar y justificar con documentos: lo que falta por justificar, con fecha de corte y los vencidos.',
    nuevo: 'Entregar un anticipo',
    ficha: 'Anticipo',
    liquidar: 'Liquidar anticipo',
    imprimir: 'Liquidación del anticipo',
  },
  bandeja: {
    titulo: 'Bandeja de documentos',
    descripcion:
      'Facturas registradas para Cuentas por liquidar que todavía no tienen anticipo: márquelas y asígnelas a uno abierto, varias a la vez.',
  },
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
