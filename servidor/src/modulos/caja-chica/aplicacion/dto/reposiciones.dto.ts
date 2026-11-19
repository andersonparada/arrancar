import type { FormaDeReposicion } from '../../dominio/reposiciones.js';
import type { ComprobanteDto } from './comprobantes.dto.js';

/** Lo que se pide a Bancos, por concepto, y suma el monto de la reposición. Dinero como texto con dos decimales. */
export interface DesgloseDeReposicionDto {
  /** `reintegro_de_caja_chica`: lo gastado sin activo fijo, menos notas de crédito y sobrantes. */
  operacion: string;
  /** `reintegro_de_caja_chica_de_activo`. */
  activo: string;
  /** `faltante_de_efectivo`. */
  faltante: string;
}

/** Una línea de la reposición: el comprobante y lo que aportó (firmado: lo que resta va negativo). */
export interface LineaDeReposicionDto {
  comprobante: ComprobanteDto;
  monto: string;
}

/** La reposición como la muestra la lista. */
export interface ReposicionResumenDto {
  id: string;
  fondoId: string;
  numero: number;
  fecha: string;
  forma: FormaDeReposicion;
  monto: string;
  movimientoId: string | null;
  custodio: string;
  laHizoElCustodio: boolean;
  estado: 'vigente' | 'anulada';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** La reposición completa, para la ficha y la impresión; también es lo que queda en la auditoría como «anterior». */
export interface ReposicionDto extends ReposicionResumenDto {
  desglose: DesgloseDeReposicionDto;
  lineas: LineaDeReposicionDto[];
  /** Los avisos que no bloquean (Bancos y la separación de funciones); solo al registrar. */
  avisos: string[];
}

/** Lo que se presenta para pedir la reposición: los pendientes del fondo y cómo se repartirían en Bancos. */
export interface SolicitudDeReposicionDto {
  fondoId: string;
  fondoNombre: string;
  custodio: string | null;
  pendientes: ComprobanteDto[];
  total: string;
  desglose: DesgloseDeReposicionDto;
}
