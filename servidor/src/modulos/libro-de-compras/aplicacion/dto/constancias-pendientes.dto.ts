import type { GrupoDeEntero } from '../../dominio/retenciones/grupo-de-entero.js';
import type { RetencionDto } from './retenciones.dto.js';

/** Una retención practicada que todavía no tiene constancia, con los plazos de su entero y de su constancia. */
export interface ConstanciaPendienteDto {
  /** Primer día del mes de la retención. */
  mes: string;
  grupo: GrupoDeEntero;
  nombreDelGrupo: string;
  /** Último día para enterar el mes y grupo. */
  plazoDelGrupo: string;
  /** Días de calendario que faltan para el plazo del entero; negativo si ya pasó. */
  diasParaElPlazo: number;
  plazoVencido: boolean;
  /** El mes y grupo tiene un entero vigente. */
  enterado: boolean;
  /** Último día para entregar la constancia; `null` si el impuesto no tiene plazo propio (IVA). */
  plazoDeLaConstancia: string | null;
  diasParaLaConstancia: number | null;
  constanciaVencida: boolean;
  /** «Sin plazo propio confirmado» cuando no hay `plazoDeLaConstancia`. */
  notaDelPlazo: string | null;
  retencion: RetencionDto;
}

/** Lo pendiente de un mes y grupo (solo documentos vigentes). */
export interface TotalPendienteDto {
  mes: string;
  grupo: GrupoDeEntero;
  nombreDelGrupo: string;
  plazoDelGrupo: string;
  cantidad: number;
  retenido: string;
}

export interface ConstanciasPendientesDto {
  /** Primer día del último mes incluido. */
  hasta: string;
  /** El día con que se calcularon los plazos. */
  hoy: string;
  filtros: { grupo: GrupoDeEntero | null; proveedorId: string | null };
  /** De documentos vigentes, por mes, grupo y fecha. */
  pendientes: ConstanciaPendienteDto[];
  /** De documentos anulados con la resolución pendiente: aparte, no suman. */
  anuladas: ConstanciaPendienteDto[];
  totales: TotalPendienteDto[];
  total: { cantidad: number; retenido: string };
}
