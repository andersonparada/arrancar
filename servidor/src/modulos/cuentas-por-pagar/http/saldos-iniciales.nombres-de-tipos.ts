import type { TipoDeDocumento } from '../dominio/tipos-de-documento.js';

/** Los tipos de documento con el nombre que ve quien carga (el mismo de las pantallas). */
export const NOMBRES_DE_TIPOS: Record<TipoDeDocumento, string> = {
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
