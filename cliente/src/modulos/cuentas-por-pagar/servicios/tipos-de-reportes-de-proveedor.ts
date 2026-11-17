import type { AvisoDelReporte } from './tipos-de-reportes';

export type PresentacionDelEstado = 'interna' | 'para_el_proveedor';

export type HechoDelEstado =
  | 'documento'
  | 'nota_de_credito'
  | 'pago'
  | 'reintegro'
  | 'diferencia_menor'
  | 'baja_de_saldo_a_favor'
  | 'anulacion_de_documento'
  | 'anulacion_de_pago'
  | 'anulacion_de_reintegro'
  | 'anulacion_de_ajuste'
  | 'retencion';

/** Una línea de R3; `cargo`, `abono` y `saldo` van nulos donde no aplican (una línea anulada no tiene saldo). */
export interface LineaDelEstado {
  fecha: string;
  hecho: HechoDelEstado;
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

export interface TotalesDelEstado {
  saldoAnterior: string;
  cargos: string;
  abonos: string;
  saldoFinal: string;
}

export interface EstadoDeCuenta {
  proveedor: { id: string; nombre: string; nit: string | null };
  presentacion: PresentacionDelEstado;
  desde: string;
  hasta: string;
  lineas: LineaDelEstado[];
  totales: TotalesDelEstado;
  /** Solo en la presentación interna. */
  alCorte?: { comprometido: string; disponible: string };
  avisos: AvisoDelReporte[];
  leyendas: string[];
}

export type TramoDePrescripcion = 'menos_de_1' | 'de_1_a_2' | 'de_2_a_3' | 'de_3_a_4' | 'de_4_a_5' | 'de_5_o_mas';

/** Una nota con saldo a favor en R4. */
export interface FilaDeSaldoAFavor {
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

export interface ReporteDeSaldosAFavor {
  corte: string;
  fechaDeInicio: string | null;
  filas: FilaDeSaldoAFavor[];
  totalesPorTramo: Record<TramoDePrescripcion, string>;
  total: string;
  posiblementePrescrito: { cantidad: number; total: string };
  avisos: AvisoDelReporte[];
  leyendas: string[];
}

/** Una contraseña vigente con saldo y pago prometido vencido (R5). */
export interface FilaDeContrasenaPorPagar {
  id: string;
  numero: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  pagoPrometido: string;
  diasDeAtraso: number;
  vence: string | null;
  documentosConSaldo: number;
  saldo: string;
  autorizado: string;
  sinAutorizar: string;
  comprometido: string;
  impresa: boolean;
}

export interface ReporteDeContrasenasPorPagar {
  hoy: string;
  pagoPrometidoHasta: string;
  filas: FilaDeContrasenaPorPagar[];
  totales: { cantidad: number; saldo: string; autorizado: string; sinAutorizar: string };
}
