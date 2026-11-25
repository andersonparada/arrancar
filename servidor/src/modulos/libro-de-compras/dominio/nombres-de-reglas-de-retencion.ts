import type { ReglaDeRetencion } from './retencion-propuesta.js';

/** Cómo se llama cada regla de retención ante el usuario (reportes y enlaces contables). */
export const NOMBRES_DE_REGLAS_DE_RETENCION: Readonly<Record<ReglaDeRetencion, string>> = {
  iva_exportador_agropecuario: 'IVA exportador agropecuario',
  iva_exportador: 'IVA exportador',
  iva_contribuyente_especial: 'IVA contribuyente especial',
  iva_otro_agente: 'IVA otro agente',
  iva_sector_publico: 'IVA sector público',
  iva_pequeno_contribuyente: 'IVA pequeño contribuyente (5 %)',
  isr_opcional_simplificado: 'ISR opcional simplificado',
  iva_factura_especial: 'IVA factura especial',
  isr_factura_especial: 'ISR factura especial',
};
