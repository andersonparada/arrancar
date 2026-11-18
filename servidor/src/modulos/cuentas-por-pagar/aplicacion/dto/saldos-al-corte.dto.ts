import type { EstadoDePago } from '../../dominio/pagos.js';
import type { TramoDeAntiguedad } from '../../dominio/saldo-al-corte.js';
import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Lo que el reporte avisa sin frenarlo: un `codigo` estable para el cliente y el texto para leer. */
export interface AvisoDelReporteDto {
  codigo: string;
  mensaje: string;
}

/** El saldo de los cargos por tramo de antigüedad (por «Vence»), en quetzales como texto. */
export interface TramosDto {
  porVencer: string;
  de1a30: string;
  de31a60: string;
  de61a90: string;
  masDe90: string;
  sinVencimiento: string;
}

/** Las cifras de un proveedor, de un NIT o de un bloque. En los deudores el saldo neto va en positivo (lo que nos deben). */
export interface CifrasDeSaldoDto extends TramosDto {
  totalCargos: string;
  saldosAFavor: string;
  saldoNeto: string;
  /** Cheques posfechados ya entregados. */
  comprometido: string;
  /** `saldoNeto - comprometido`; nulo en los deudores, que no se pagan. */
  disponible: string | null;
  /** La parte de los cargos que todavía no está autorizada. */
  sinAutorizar: string;
}

/** Una fila de R1: un NIT (o un proveedor sin NIT real) con sus fichas si el NIT está en más de una. */
export interface FilaDeSaldoDto extends CifrasDeSaldoDto {
  nit: string | null;
  nombre: string;
  /** La ficha de proveedor; nulo si el NIT está en varias (cada una va en `fichas`). */
  proveedorId: string | null;
  fichas?: FilaDeSaldoDto[];
}

export interface TotalesDeSaldosDto {
  acreedores: CifrasDeSaldoDto;
  deudores: CifrasDeSaldoDto;
  /** Acreedores menos deudores: el saldo de Proveedores en el balance. */
  saldoNeto: string;
  /** Los tramos de todos los cargos del reporte y su porcentaje sobre el total de cargos (no sobre el neto). */
  cargosPorTramo: TramosDto;
  porcentajesPorTramo: TramosDto;
  totalCargos: string;
}

/**
 * La conciliación al pie de R1 (dictamen 12): el saldo neto del auxiliar menos la transitoria «Pagos a proveedores por
 * aplicar» (R11 al mismo corte) es lo que se presenta como Proveedores. Solo con todos los proveedores y toda autorización.
 */
export interface ConciliacionDeSaldosDto {
  saldoNetoDelAuxiliar: string;
  pagosPorAplicar: string;
  proveedoresNetoDePagosPorAplicar: string;
}

export interface ReporteDeSaldosPorProveedorDto {
  corte: string;
  fechaDeInicio: string | null;
  acreedores: FilaDeSaldoDto[];
  deudores: FilaDeSaldoDto[];
  totales: TotalesDeSaldosDto;
  /** Falta si se filtró por proveedor o por autorización: la transitoria no es de un proveedor. */
  conciliacion?: ConciliacionDeSaldosDto;
  avisos: AvisoDelReporteDto[];
  leyendas: string[];
}

/** Un cargo de R2 con todo lo que explica su saldo al corte. */
export interface FilaDeDocumentoAlCorteDto {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  tipo: TipoDeDocumento;
  origen: OrigenDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  vencimiento: string | null;
  diasVencido: number | null;
  tramo: TramoDeAntiguedad;
  total: string;
  retenciones: string;
  neto: string;
  /** Solo en un saldo inicial: lo pagado o rebajado antes de la fecha de inicio. */
  anterioresAlInicio: string | null;
  notasAplicadas: string;
  pagado: string;
  ajustado: string;
  saldo: string;
  comprometido: string;
  estadoDePago: EstadoDePago;
  autorizado: boolean;
  contrasena: { numero: string; pagoPrometido: string } | null;
  /** Solo en un saldo inicial, informativa. */
  retencionesPorPracticar: string | null;
}

export interface TotalesDeDocumentosAlCorteDto {
  total: string;
  retenciones: string;
  pagado: string;
  saldo: string;
  comprometido: string;
}

export interface ReporteDeDocumentosAUnaFechaDto {
  corte: string;
  fechaDeInicio: string | null;
  filas: FilaDeDocumentoAlCorteDto[];
  /** Cuántos cargos cumplen el filtro (no solo los de la página). */
  total: number;
  pagina: number;
  limite: number | null;
  totales: TotalesDeDocumentosAlCorteDto;
  avisos: AvisoDelReporteDto[];
  leyendas: string[];
}
