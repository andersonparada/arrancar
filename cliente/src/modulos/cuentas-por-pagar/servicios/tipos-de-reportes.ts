import type { OrigenDelDocumento, TipoDeDocumento } from './tipos';

/** Lo que el reporte avisa sin frenarlo: `codigo` estable y el texto para leer. */
export interface AvisoDelReporte {
  codigo: string;
  mensaje: string;
}

/** El saldo de los cargos por tramo de antigüedad (por «Vence»), en quetzales como texto. */
export interface Tramos {
  porVencer: string;
  de1a30: string;
  de31a60: string;
  de61a90: string;
  masDe90: string;
  sinVencimiento: string;
}

/** Las cifras de un proveedor, de un NIT o de un bloque. En los deudores el saldo neto va en positivo. */
export interface CifrasDeSaldo extends Tramos {
  totalCargos: string;
  saldosAFavor: string;
  saldoNeto: string;
  comprometido: string;
  /** Nulo en los deudores, que no se pagan. */
  disponible: string | null;
  sinAutorizar: string;
}

/** Una fila de R1: un NIT (o un proveedor sin NIT real) con sus fichas si el NIT está en más de una. */
export interface FilaDeSaldo extends CifrasDeSaldo {
  nit: string | null;
  nombre: string;
  /** Nulo si el NIT está en varias fichas (cada una va en `fichas`). */
  proveedorId: string | null;
  fichas?: FilaDeSaldo[];
}

export interface TotalesDeSaldos {
  acreedores: CifrasDeSaldo;
  deudores: CifrasDeSaldo;
  saldoNeto: string;
  cargosPorTramo: Tramos;
  porcentajesPorTramo: Tramos;
  totalCargos: string;
}

export interface ReporteDeSaldosPorProveedor {
  corte: string;
  fechaDeInicio: string | null;
  acreedores: FilaDeSaldo[];
  deudores: FilaDeSaldo[];
  totales: TotalesDeSaldos;
  avisos: AvisoDelReporte[];
  leyendas: string[];
}

export type TramoDeAntiguedad =
  'por_vencer' | 'de_1_a_30' | 'de_31_a_60' | 'de_61_a_90' | 'mas_de_90' | 'sin_vencimiento';
export type EstadoDePago = 'pendiente' | 'en_parte' | 'comprometido' | 'pagado';
export type AutorizacionDelReporte = 'todos' | 'autorizados' | 'sin_autorizar';
export type TipoDeCargo = Exclude<TipoDeDocumento, 'nota_de_credito'>;

/** Un cargo de R2 con todo lo que explica su saldo al corte. */
export interface FilaDeDocumentoAlCorte {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  tipo: TipoDeDocumento;
  origen: OrigenDelDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  vencimiento: string | null;
  diasVencido: number | null;
  tramo: TramoDeAntiguedad;
  total: string;
  retenciones: string;
  neto: string;
  anterioresAlInicio: string | null;
  notasAplicadas: string;
  pagado: string;
  ajustado: string;
  saldo: string;
  comprometido: string;
  estadoDePago: EstadoDePago;
  autorizado: boolean;
  contrasena: { numero: string; pagoPrometido: string } | null;
  retencionesPorPracticar: string | null;
}

export interface TotalesDeDocumentosAlCorte {
  total: string;
  retenciones: string;
  pagado: string;
  saldo: string;
  comprometido: string;
}

export interface ReporteDeDocumentosAUnaFecha {
  corte: string;
  fechaDeInicio: string | null;
  filas: FilaDeDocumentoAlCorte[];
  /** Cuántos cargos cumplen el filtro (no solo los de la página). */
  total: number;
  pagina: number;
  limite: number | null;
  totales: TotalesDeDocumentosAlCorte;
  avisos: AvisoDelReporte[];
  leyendas: string[];
}
