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
  notas: {
    titulo: 'Notas',
    descripcion: 'Notas de crédito y de débito de la empresa.',
    nuevo: 'Nueva nota',
    editar: 'Editar nota',
  },
  transferencias: {
    titulo: 'Transferencias',
    descripcion: 'Transferencias entre cuentas propias de la empresa.',
    nuevo: 'Nueva transferencia',
    editar: 'Editar transferencia',
  },
  movimientos: {
    titulo: 'Movimientos',
    descripcion: 'Reporte de movimientos de la empresa: notas, transferencias, cheques y saldos iniciales.',
    nuevo: 'Nuevo movimiento',
    editar: 'Editar movimiento',
  },
  chequeras: {
    titulo: 'Chequeras',
    descripcion: 'Las chequeras de las cuentas bancarias de la empresa.',
    nuevo: 'Nueva chequera',
    editar: 'Editar chequera',
  },
  cheques: {
    titulo: 'Cheques',
    descripcion: 'Los cheques emitidos y anulados de la empresa.',
    nuevo: 'Emitir cheque',
    editar: 'Editar cheque',
  },
  conciliaciones: {
    titulo: 'Conciliaciones',
    descripcion: 'Conciliación mensual de cada cuenta con su estado de cuenta.',
    nuevo: 'Nueva conciliación',
    editar: 'Conciliar',
  },
  correlativos: {
    titulo: 'Correlativos',
    descripcion:
      'Numeración de notas y transferencias: último número, emitidos y los huecos explicados con la auditoría.',
  },
  chequesCaducos: {
    titulo: 'Cheques caducos',
    descripcion: 'Cheques emitidos que el banco no ha cobrado y ya pasaron el plazo de vencimiento.',
  },
  conceptos: {
    titulo: 'Conceptos',
    descripcion: 'Los conceptos que clasifican las notas y los cheques: por qué se mueve el dinero del banco.',
    nuevo: 'Nuevo concepto',
    editar: 'Editar concepto',
  },
  sinClasificar: {
    titulo: 'Sin clasificar',
    descripcion:
      'Notas y cheques que todavía no tienen concepto: márquelos y clasifíquelos de una vez. Solo cambia el concepto, no el dinero.',
  },
  flujoDeEfectivo: {
    titulo: 'Flujo de efectivo',
    descripcion:
      'Método directo: lo que entró y salió de las cuentas por actividad (operación, inversión y financiamiento), con su control de cuadre.',
  },
  movimientosPorConcepto: {
    titulo: 'Movimientos por concepto',
    descripcion:
      'Total de entradas, salidas y cantidad por concepto en un rango de fechas, con el detalle de cada uno.',
  },
  // generador: ventanas
} as const;
