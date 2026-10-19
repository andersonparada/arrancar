import type {
  CausaDeAnulacion,
  DestinoDeDocumento,
  MotivoFueraDelLibro,
  MotivoSinCredito,
  TipoDeDocumento,
} from './servicios/documentos.api';

/** Textos de la pantalla «Ingreso de facturas» (lista, ficha y anulación). */
export const VENTANA_DE_DOCUMENTOS = {
  titulo: 'Ingreso de facturas',
  descripcion: 'Las facturas y notas de crédito de las compras de la empresa.',
  registrar: 'Registrar factura',
  registrarNoDisponible: 'El formulario de registro estará disponible próximamente.',
  ficha: 'Factura',
} as const;

export const TIPOS_DE_DOCUMENTO: Record<TipoDeDocumento, string> = {
  factura: 'Factura',
  factura_pequeno_contribuyente: 'Factura de pequeño contribuyente',
  nota_de_credito: 'Nota de crédito',
  recibo: 'Recibo',
};

export const DESTINOS_DE_DOCUMENTO: Record<DestinoDeDocumento, string> = {
  'caja-chica': 'Caja chica',
  'cuentas-por-liquidar': 'Cuentas por liquidar',
  'cuentas-por-pagar': 'Cuentas por pagar',
};

export const CAUSAS_DE_ANULACION: Record<CausaDeAnulacion, string> = {
  error_de_captura: 'Error de captura',
  fel_anulada_por_el_emisor: 'La FEL fue anulada por el emisor',
  no_corresponde_a_la_empresa: 'No corresponde a la empresa',
};

/** Por qué el IVA de un documento no es crédito fiscal y va al costo. */
export const MOTIVOS_SIN_CREDITO: Record<MotivoSinCredito, string> = {
  empresa_sin_credito: 'La empresa no tiene crédito fiscal: el IVA va al costo.',
  fuera_de_plazo: 'Se registró fuera del plazo para tomar el crédito fiscal: el IVA va al costo.',
  no_vinculado: 'La compra no está vinculada a operaciones gravadas: el IVA no es crédito fiscal y va al costo.',
  pequeno_contribuyente: 'El proveedor es pequeño contribuyente: no hay IVA que tomar como crédito fiscal.',
  exento: 'Lo comprado está exento de IVA: no hay crédito fiscal.',
};

/** Por qué un documento no se muestra en los reportes de la SAT. */
export const MOTIVOS_FUERA_DEL_LIBRO: Record<MotivoFueraDelLibro, string> = {
  sin_fel: 'No tiene FEL: no aparece en los reportes de la SAT.',
  fel_a_consumidor_final: 'La FEL se emitió a consumidor final, no al NIT de la empresa: queda fuera del libro.',
  fel_a_otro_nit: 'La FEL se emitió a otro NIT, no al de la empresa: queda fuera del libro.',
};

export const REGLAS_DE_RETENCION: Record<string, string> = {
  iva_exportador_agropecuario: 'IVA, exportador (producto agropecuario)',
  iva_exportador: 'IVA, exportador',
  iva_contribuyente_especial: 'IVA, contribuyente especial',
  iva_otro_agente: 'IVA, otro agente de retención',
  iva_sector_publico: 'IVA, sector público',
  iva_pequeno_contribuyente: 'IVA, pequeño contribuyente',
  isr_opcional_simplificado: 'ISR, proveedor del régimen opcional simplificado',
};

export const AYUDA_DE_ANULAR =
  'Anular aquí solo anula el registro en Arrancar. La factura sigue vigente en la SAT: solo su emisor puede anularla allá.';
