import type { HechoDelEstado, PresentacionDelEstado } from '../../dominio/estado-de-cuenta.js';
import type { TramoDePrescripcion } from '../../dominio/prescripcion-de-saldos.js';
import type { AvisoDelReporteDto } from './saldos-al-corte.dto.js';

/** El proveedor de un estado de cuenta. */
export interface ProveedorDelReporteDto {
  id: string;
  nombre: string;
  nit: string | null;
}

/** Una línea de R3; `cargo`, `abono` y `saldo` van nulos donde no aplican (en una línea anulada no hay saldo). */
export interface LineaDelEstadoDto {
  fecha: string;
  hecho: HechoDelEstado | 'retencion';
  documentoId: string | null;
  concepto: string;
  /** Solo en la presentación interna, en los documentos. */
  total: string | null;
  retenciones: string | null;
  /** Solo en un saldo inicial: lo pagado o rebajado antes de la fecha de inicio. */
  anterioresAlInicio: string | null;
  cargo: string | null;
  abono: string | null;
  saldo: string | null;
  /** Anulada dentro del mismo rango: sale en gris y no suma. */
  anulada: boolean;
}

export interface TotalesDelEstadoDto {
  saldoAnterior: string;
  cargos: string;
  abonos: string;
  saldoFinal: string;
}

export interface EstadoDeCuentaDto {
  proveedor: ProveedorDelReporteDto;
  presentacion: PresentacionDelEstado;
  desde: string;
  hasta: string;
  lineas: LineaDelEstadoDto[];
  totales: TotalesDelEstadoDto;
  /** Solo en la presentación interna: lo comprometido (cheques posfechados) y lo disponible al día `hasta`. */
  alCorte?: { comprometido: string; disponible: string };
  avisos: AvisoDelReporteDto[];
  leyendas: string[];
}

/** Una nota con saldo a favor en R4, con su antigüedad y su posible prescripción. */
export interface FilaDeSaldoAFavorDto {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  base: string;
  aplicado: string;
  ajustado: string;
  reintegrado: string;
  saldoLibre: string;
  ultimoMovimiento: string;
  aniosDesdeElUltimoMovimiento: number;
  tramo: TramoDePrescripcion;
  posiblePrescripcionDesde: string;
  posiblementePrescrito: boolean;
  enContrasena: boolean;
}

export interface ReporteDeSaldosAFavorDto {
  corte: string;
  fechaDeInicio: string | null;
  filas: FilaDeSaldoAFavorDto[];
  totalesPorTramo: Record<TramoDePrescripcion, string>;
  total: string;
  /** Lo que ya pasó el plazo: aparte, «consulte a su contador». */
  posiblementePrescrito: { cantidad: number; total: string };
  avisos: AvisoDelReporteDto[];
  leyendas: string[];
}

/** Una contraseña vigente con saldo en R5. */
export interface FilaDeContrasenaPorPagarDto {
  id: string;
  numero: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  pagoPrometido: string;
  /** Los días que lleva vencido el pago prometido (cero si todavía no vence). */
  diasDeAtraso: number;
  vence: string | null;
  documentosConSaldo: number;
  saldo: string;
  /** Lo que ya se puede pagar. */
  autorizado: string;
  sinAutorizar: string;
  comprometido: string;
  impresa: boolean;
}

export interface ReporteDeContrasenasPorPagarDto {
  hoy: string;
  pagoPrometidoHasta: string;
  filas: FilaDeContrasenaPorPagarDto[];
  totales: { cantidad: number; saldo: string; autorizado: string; sinAutorizar: string };
}
