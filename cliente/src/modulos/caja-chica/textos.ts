import type { FormaDeCambioDeMonto, FormaDeEntrega, TipoDeCambioDeMonto } from './servicios/tipos-de-fondos';

/** Nombres de las ventanas y del menú del módulo Caja chica. */

export const NOMBRE_CAJA_CHICA = 'Caja chica';

export const VENTANAS_CAJA_CHICA = {
  fondos: {
    titulo: 'Fondos de caja chica',
    descripcion:
      'El efectivo fijo que cada custodio maneja para gastos menores: cuánto hay, cuánto está pendiente de reponer y qué falta revisar.',
    ficha: 'Fondo de caja chica',
    abrir: 'Abrir fondo',
  },
  bandeja: {
    titulo: 'Bandeja de caja chica',
    descripcion:
      'Las facturas que se registraron con destino a Caja chica y todavía no están en un fondo: marque las que va a pagar de un fondo y asígnelas de una vez.',
  },
  // generador: ventanas
} as const;

export const FORMAS_DE_ENTREGA: Record<FormaDeEntrega, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Transferencia o débito',
};

export const TIPOS_DE_CAMBIO_DE_MONTO: Record<TipoDeCambioDeMonto, string> = {
  apertura: 'Apertura',
  aumento: 'Aumento',
  disminucion: 'Disminución',
  cierre: 'Cierre',
};

export const FORMAS_DE_CAMBIO_DE_MONTO: Record<FormaDeCambioDeMonto, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_de_credito: 'Depósito (nota de crédito)',
  saldo_inicial: 'Saldo inicial',
  sin_deposito: 'Sin depósito',
};

export const AYUDA_DE_LA_FECHA = 'Si la deja vacía se usa la fecha de hoy.';
export const AYUDA_DEL_TOPE =
  'Monto máximo por comprobante. Pasarse exige el permiso de excepción y un motivo. Vacío usa el tope de la empresa.';
export const AYUDA_DEL_CHEQUE =
  'El cheque sale a nombre del beneficiario. Si lo deja vacío se usa el nombre del custodio. Por seguridad, un cheque de caja chica no puede ser al portador.';
export const AYUDA_DEL_BANCO =
  'Genera el cheque o la nota en Bancos: no hace falta registrarlo allá. Las chequeras y cuentas se crean en Bancos.';
export const AYUDA_DE_LA_RETENCION =
  'Esta factura lleva retención: la entera la empresa, no el fondo. Para pagarla de un fondo hace falta el permiso de excepción y un motivo.';
export const AYUDA_DEL_VALE =
  'Un vale de gasto es para gastos menores sin factura. Se registra como gasto no deducible, con el nombre de quien recibió el dinero.';

export const MAXIMO_DEL_MOTIVO = 300;
