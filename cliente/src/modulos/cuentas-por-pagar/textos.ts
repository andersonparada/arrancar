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
  saldosIniciales: {
    titulo: 'Saldos iniciales',
    descripcion: 'Lo que la empresa debía a sus proveedores al cierre del día anterior a la fecha de inicio.',
    nuevo: 'Nuevo saldo inicial',
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

/** Textos del contador (C-U8-1 a C-U8-5) para la ventana de saldos iniciales. */
export const AVISO_DE_LO_QUE_SE_CARGA =
  'Cargue solo documentos registrados en el sistema anterior que siguen pendientes de pago al cierre del día anterior a la fecha de inicio. Lo emitido antes pero no registrado allá va al Libro de compras.';

export const AVISO_DE_NOTAS_POSTERIORES =
  'Las notas de crédito o de débito recibidas desde la fecha de inicio sobre estos documentos todavía no se pueden registrar: no corrija el saldo pendiente por ellas.';

export const AYUDA_DE_REFERENCIA = 'Cómo se llamaba el documento en el sistema anterior (opcional).';
export const AYUDA_DE_VENCIMIENTO =
  'Vacío es según los días de crédito del proveedor; mejor escriba el real si lo conoce. Puede ser anterior a la fecha de inicio si ya venció.';
export const AYUDA_DE_RETENCIONES = 'Todas las retenciones del documento, ya practicadas o no.';
export const AYUDA_DE_RETENCIONES_POR_PRACTICAR =
  'La parte de las retenciones que la empresa todavía no practicó. No cambia el saldo pendiente.';
export const AYUDA_DE_SALDO_PENDIENTE =
  'Lo que falta pagarle al proveedor, sin retenciones: total menos retenciones, menos lo pagado y las notas anteriores a la fecha de inicio.';
export const AYUDA_DEL_TIPO =
  'Una nota de crédito se carga con su saldo a favor. Un anticipo a proveedor no es una nota de crédito: no se carga aquí.';

export const AYUDA_DEL_CUADRE =
  'Compare estos totales con el balance de apertura: cargos menos notas a favor contra Proveedores; las retenciones por practicar, contra Retenciones por pagar si los libros anteriores llevaban Proveedores sin descontarlas.';
