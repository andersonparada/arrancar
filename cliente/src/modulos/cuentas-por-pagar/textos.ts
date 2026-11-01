import type { CausaDeAnulacion, EstadoDeDocumento, TipoDeDocumento } from './servicios/tipos';

/** Nombres de las ventanas y del menú del módulo Cuentas por pagar. */

export const NOMBRE_CUENTAS_POR_PAGAR = 'Cuentas por pagar';

export const VENTANAS_CUENTAS_POR_PAGAR = {
  bandeja: {
    titulo: 'Bandeja de cuentas por pagar',
    descripcion:
      'Lo que llegó del libro de compras y falta completar: confirme el vencimiento de cada documento y complételos.',
  },
  documentos: {
    titulo: 'Documentos por pagar',
    descripcion: 'Lo que se debe a los proveedores: busque, autorice y revise cada documento con su saldo.',
    ficha: 'Documento por pagar',
  },
  // generador: ventanas
} as const;

export const TITULO_SECCION_DE_PAGO = 'Cuentas por pagar';

export const TIPOS_DE_DOCUMENTO: Record<TipoDeDocumento, string> = {
  factura: 'Factura',
  factura_pequeno_contribuyente: 'Factura de pequeño contribuyente',
  factura_pequeno_contribuyente_electronico: 'Factura de pequeño contribuyente electrónica',
  factura_contribuyente_agropecuario: 'Factura de contribuyente agropecuario',
  factura_primario_pecuario: 'Factura de productor primario o pecuario',
  factura_especial: 'Factura especial',
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
  recibo: 'Recibo',
};

export const ESTADOS_DE_DOCUMENTO: Record<EstadoDeDocumento, string> = {
  pendiente: 'Por completar',
  registrado: 'Por autorizar',
  autorizado: 'Autorizado',
  anulado: 'Anulado',
};

export const CAUSAS_DE_ANULACION: Record<CausaDeAnulacion, string> = {
  error_de_captura: 'Error de captura',
  fel_anulada_por_el_emisor: 'El emisor anuló la FEL en la SAT',
  no_corresponde_a_la_empresa: 'No es una compra de esta empresa',
};

export const AYUDA_DE_DIAS_DE_CREDITO =
  'Días que da el proveedor para pagar, contados desde la fecha de emisión de cada factura. Vacío es un mes; 0 es de contado.';

export const AYUDA_DE_CONTAR_DESDE_LA_RECEPCION =
  'Úselo si el plazo de este proveedor corre desde que la empresa recibe la factura y no desde que se emite.';

export const AYUDA_DE_ANULAR =
  'Esto anula únicamente el registro en Arrancar (en Cuentas por pagar y en el libro de compras), no la factura en la SAT. Solo su emisor puede anularla allá. Si hubo una devolución o un descuento, use una nota de crédito.';

export const MAXIMO_DEL_MOTIVO = 300;
