/** Actividad de flujo de una línea del reporte (NIC 7): las que no son «ninguna». */
export type ActividadDelFlujo = 'operacion' | 'inversion' | 'financiamiento';

/** Qué movimientos se suman: entre dos fechas incluidas, de una cuenta (o todas) y de algunos conceptos (o todos). */
export interface FiltroDeTotalesPorConcepto {
  desde: string;
  hasta: string;
  cuentaBancariaId?: string;
  conceptoIds?: string[];
}

/**
 * Lo que sumó un concepto en el rango. Un movimiento inverso se suma en el concepto de su **original**, en el mismo
 * sentido que el original y restando: así una anulación deja la línea en cero aunque cruce de mes.
 */
export interface TotalesDeUnConcepto {
  conceptoId: string;
  conceptoNombre: string;
  claveDeSistema: string | null;
  actividadDeFlujo: ActividadDelFlujo | 'ninguna';
  grupoDeFlujo: string | null;
  /** Créditos originales menos débitos inversos, con dos decimales. */
  entradas: string;
  /** Débitos y cheques originales menos créditos inversos, con dos decimales. */
  salidas: string;
  /** Movimientos originales del rango. */
  cantidad: number;
  /** Movimientos inversos del rango (anulaciones y caducidades). */
  cantidadDeInversos: number;
}

/** Los saldos de las cuentas incluidas (solo lo vigente, sin anulados a la antigua) al inicio y al final del rango. */
export interface SaldosDelRango {
  /** Con movimientos de fecha anterior a `desde`. */
  saldoAlInicio: string;
  /** Con movimientos hasta `hasta`, incluida. */
  saldoAlFinal: string;
}

/** Una línea del flujo: lo que entró y salió por esa clase de cobro o pago. */
export interface LineaDeFlujoDto {
  etiqueta: string;
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
}

export interface ActividadDelFlujoDto {
  actividad: ActividadDelFlujo;
  lineas: LineaDeFlujoDto[];
  entradas: string;
  salidas: string;
  neto: string;
}

/** Las líneas que no son de una actividad pero hacen falta para que el período cuadre. */
export type ClaveDeLineaAparte = 'transferencias' | 'sin_actividad' | 'sin_clasificar';

export interface LineaAparteDto extends LineaDeFlujoDto {
  clave: ClaveDeLineaAparte;
}

/** saldo al inicio + saldos iniciales del rango + flujo neto = saldo al final en libros. */
export interface ControlDeCuadreDto {
  saldoAlInicio: string;
  /** La apertura de cuentas dentro del rango: no es un flujo, pero sí mueve el saldo. */
  saldosInicialesDelRango: string;
  flujoNeto: string;
  saldoCalculado: string;
  saldoAlFinal: string;
  /** Saldo al final menos el calculado; cero si cuadra. */
  diferencia: string;
  cuadra: boolean;
}

export interface ReporteDeFlujoDeEfectivoDto {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  /** Siempre las tres actividades, en orden: operación, inversión y financiamiento. */
  actividades: ActividadDelFlujoDto[];
  lineasAparte: LineaAparteDto[];
  control: ControlDeCuadreDto;
}

export interface ConceptoDelReporteDto {
  conceptoId: string;
  conceptoNombre: string;
  esDeSistema: boolean;
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
  cantidadDeInversos: number;
}

export interface ReporteDeMovimientosPorConceptoDto {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  /** Por nombre. */
  conceptos: ConceptoDelReporteDto[];
  entradas: string;
  salidas: string;
  neto: string;
  cantidad: number;
}
