import type { DocumentoCalculado } from './calculo-de-documento.js';
import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

export type ImpuestoRetenido = 'iva' | 'isr';

export const REGLAS_DE_RETENCION = [
  'iva_exportador_agropecuario',
  'iva_exportador',
  'iva_contribuyente_especial',
  'iva_otro_agente',
  'iva_sector_publico',
  'iva_pequeno_contribuyente',
  'isr_opcional_simplificado',
] as const;
export type ReglaDeRetencion = (typeof REGLAS_DE_RETENCION)[number];

/** De dónde sale la fecha de la retención; `destino` es la que pone el destino (`fechar_retencion`). */
export type OrigenDeLaFecha = 'recepcion' | 'emision' | 'destino';

/** Lo que propone una estrategia; cumple los `check` de la tabla `retenciones` (§3.7). Todo en centavos. */
export interface RetencionPropuesta {
  impuesto: ImpuestoRetenido;
  regla: ReglaDeRetencion;
  /** Mayor que cero. */
  base: number;
  /** En centésimas (15 % → 1500); `null` solo en el ISR por escalones. */
  porcentaje: number | null;
  /** Entre 0 y la base. */
  montoPropuesto: number;
  origenDeLaFecha: OrigenDeLaFecha;
}

/** Tasas en centésimas y montos en centavos, ya convertidos de la configuración. */
export interface ConfiguracionDeRetenciones {
  porcentajeExportadorAgropecuario: number;
  porcentajeExportador: number;
  porcentajeContribuyenteEspecial: number;
  porcentajeOtroAgente: number;
  porcentajeSectorPublico: number;
  porcentajePequenoContribuyente: number;
  porcentajeIsrPrimerTramo: number;
  porcentajeIsrExcedente: number;
  minimoIva: number;
  minimoSectorPublico: number;
  umbralPequenoContribuyente: number;
  limitePrimerTramoIsr: number;
  minimoIsr: number;
  incluyeIdpEnBaseIsr: boolean;
}

/** Lo que recibe cada estrategia. */
export interface EntradaDeRetenciones {
  tipo: TipoDeDocumento;
  muestraEnReportesSat: boolean;
  documento: DocumentoCalculado;
  /** Una casilla por línea de `documento.lineas`: `true` si su concepto es un producto agropecuario. */
  lineasAgropecuarias: readonly boolean[];
  empresa: DatosFiscalesDeEmpresa;
  proveedor: DatosFiscalesDeProveedor;
  configuracion: ConfiguracionDeRetenciones;
}

/** Patrón Strategy: una estrategia por regla (o por familia de reglas) de retención. */
export interface EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[];
}
