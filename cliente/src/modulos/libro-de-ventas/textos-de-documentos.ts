import type {
  CausaDeAnulacion,
  ClaseFiscal,
  DestinoDeDocumento,
  TipoDeDocumento,
  TipoDeIdentificacion,
  TipoDeLinea,
} from './servicios/documentos.api';

export const VENTANA_DE_DOCUMENTOS = {
  titulo: 'Documentos de venta',
  descripcion: 'Facturas, notas y recibos que la empresa emitió, por período.',
  registrar: 'Nuevo documento',
  tituloDelRegistro: 'Registrar un documento de venta',
  ficha: 'Documento de venta',
} as const;

/** Los nombres que usa el usuario; los dos derogados se avisan en el selector. */
export const TIPOS_DE_DOCUMENTO: Record<TipoDeDocumento, string> = {
  factura: 'Factura',
  factura_cambiaria: 'Factura cambiaria',
  factura_pequeno_contribuyente: 'Factura de pequeño contribuyente',
  factura_pequeno_contribuyente_electronico: 'Factura de pequeño contribuyente electrónico (derogada)',
  factura_contribuyente_agropecuario: 'Factura de contribuyente agropecuario (derogada)',
  factura_primario_pecuario: 'Factura de primario y pecuario',
  factura_especial_recibida: 'Factura especial (la emitió el comprador)',
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
  nota_de_abono: 'Nota de abono',
  recibo: 'Recibo',
};

/** Cómo se llama cada documento en un título corto («Factura A-123»). */
export const NOMBRE_CORTO_DE_DOCUMENTO: Record<TipoDeDocumento, string> = {
  factura: 'Factura',
  factura_cambiaria: 'Factura cambiaria',
  factura_pequeno_contribuyente: 'Factura de pequeño contribuyente',
  factura_pequeno_contribuyente_electronico: 'Factura de pequeño contribuyente',
  factura_contribuyente_agropecuario: 'Factura de contribuyente agropecuario',
  factura_primario_pecuario: 'Factura de primario y pecuario',
  factura_especial_recibida: 'Factura especial',
  nota_de_credito: 'Nota de crédito',
  nota_de_debito: 'Nota de débito',
  nota_de_abono: 'Nota de abono',
  recibo: 'Recibo',
};

export const DESTINOS_DE_DOCUMENTO: Record<DestinoDeDocumento | 'ninguno', string> = {
  'cuentas-por-cobrar': 'En cuentas por cobrar',
  ninguno: 'Sin cartera',
};

export const CLASES_FISCALES: Record<ClaseFiscal, string> = {
  gravada: 'Gravada (con IVA)',
  exenta: 'Exenta',
  exportacion: 'Exportación',
  no_afecta: 'No afecta',
};

export const TIPOS_DE_LINEA: Record<TipoDeLinea, string> = { bien: 'Bien', servicio: 'Servicio' };

export const TIPOS_DE_IDENTIFICACION: Record<TipoDeIdentificacion, string> = {
  nit: 'NIT',
  cui: 'CUI (DPI)',
  extranjero: 'Extranjero',
  cf: 'Consumidor final (CF)',
};

export const CAUSAS_DE_ANULACION: Record<CausaDeAnulacion, string> = {
  error_de_captura: 'Error al registrarlo',
  fel_anulada_en_la_sat: 'Se anuló en la SAT',
  no_corresponde_a_la_empresa: 'No corresponde a la empresa',
};

export const AYUDA_DE_ANULAR =
  'Anular el registro no anula la factura en la SAT. Si ya la anuló allá, escoja «Se anuló en la SAT». Pasado el plazo de la SAT solo se corrige con una nota de crédito.';

export const FORMULARIO_DE_DOCUMENTO = {
  registrar: 'Registrar documento',
  cancelar: 'Cancelar',
  consumidorFinal: 'Sin cliente: se registra a consumidor final (CF).',
  sinClientes:
    'No se pudo leer la lista de clientes (puede que no tenga permiso para verlos). Puede registrar a consumidor final.',
  ayudaDelTotal: 'El total de cada línea incluye el IVA. El sistema calcula el IVA y el desglose al registrar.',
  ayudaDeLaFel: 'Solo si el documento es electrónico: copie la autorización del DTE tal como sale.',
  ayudaDeLaFacturaAnterior: 'Úsela si la factura es de antes de empezar con este sistema.',
  sinFacturasDelCliente:
    'Este cliente no tiene facturas vigentes registradas. Puede usar los datos de una factura anterior.',
  sinCliente: 'Sin cliente: se buscan las facturas de consumidor final.',
  sinFacturasDeConsumidorFinal:
    'No hay facturas vigentes de consumidor final. Puede usar los datos de una factura anterior.',
  sinCoincidencias: 'Ninguna factura vigente coincide con esa serie o número.',
  errorAlBuscarFacturas:
    'No se pudieron leer las facturas. Revise su conexión y pulse «Reintentar»; si sigue igual, use los datos de una factura anterior.',
  hayMasFacturas: 'Se muestran las más recientes. Para otra, escriba su serie o número en el buscador.',
  derogado: 'Ese tipo de documento ya no existe: solo se registra si el documento es de antes de su derogación.',
} as const;
