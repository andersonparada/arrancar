import type { EstadoDeDte, EstadoDeDteEnLaSat, MotivoDeBloqueo } from '../estado-de-dte.js';
import type { TipoDte } from '../tipos-de-documento.js';

/** Un documento vigente de la empresa, con lo que se compara contra el DTE de la SAT. Montos como texto. */
export interface DocumentoConciliable {
  id: string;
  tipoDte: TipoDte | null;
  autorizacionFel: string | null;
  nitEmisor: string | null;
  nombreEmisor: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  periodo: string;
  /** El documento está fuera del libro (`muestra_en_reportes_sat` en falso): no cuenta en el período. */
  fueraDelLibro: boolean;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
}

/** Una fila de la bandeja, con lo que se compara contra el documento y lo que dice su situación. */
export interface FilaConciliable {
  id: string;
  autorizacionFel: string;
  tipoDte: TipoDte;
  serie: string;
  numero: string;
  fechaEmision: string;
  nitEmisor: string;
  nombreEmisor: string;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
  estadoSat: EstadoDeDteEnLaSat;
  estado: EstadoDeDte;
  motivoDeBloqueo: MotivoDeBloqueo | null;
  motivoDeDescarte: string | null;
}

export type CampoComparado =
  | 'autorizacionFel'
  | 'tipoDte'
  | 'nitEmisor'
  | 'serie'
  | 'numero'
  | 'fechaEmision'
  | 'total'
  | 'iva'
  | 'idp'
  | 'otrosImpuestos';

/** Un dato que no coincide: el valor en Arrancar y el de la SAT (manda el de la SAT). */
export interface DiferenciaDeConciliacion {
  campo: CampoComparado;
  arrancar: string | null;
  sat: string | null;
}

/** Una línea de cualquiera de los resultados; lo que no aplica a ese resultado va en `null`. */
export interface ItemDeConciliacion {
  autorizacionFel: string | null;
  tipoDte: TipoDte | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  nitEmisor: string | null;
  nombreEmisor: string;
  total: string;
  iva: string;
  documentoId: string | null;
  dteId: string | null;
  periodoDelDocumento: string | null;
  documentoFueraDelLibro: boolean;
  estadoEnLaBandeja: EstadoDeDte | null;
  motivoDeBloqueo: MotivoDeBloqueo | null;
  motivoDeDescarte: string | null;
  diferencias: DiferenciaDeConciliacion[];
}

/** Los resultados de la conciliación de un período; «sin datos» no es un faltante: la SAT no trajo ese mes. */
export interface ResultadoDeConciliacion {
  cuadra: ItemDeConciliacion[];
  conDiferencias: ItemDeConciliacion[];
  enLaSatYNoEnArrancar: ItemDeConciliacion[];
  registradoEnOtroPeriodo: ItemDeConciliacion[];
  /** Emitidas en el mes con un documento registrado fuera del libro (p. ej. un recibo FEL): no se concilian con el libro. */
  noVaEnElLibro: ItemDeConciliacion[];
  enArrancarYNoEnLaSat: ItemDeConciliacion[];
  sinDatosDeLaSat: ItemDeConciliacion[];
  anuladoEnLaSatYVigenteAqui: ItemDeConciliacion[];
  descartado: ItemDeConciliacion[];
}

/** Si la SAT trajo datos del mes de una fecha de emisión (algún lote de la bandeja lo toca). */
export interface CoberturaDeLaSat {
  cubreElMesDe(fechaDeEmision: string): boolean;
}

/** Lo que se necesita para conciliar un período. */
export interface EntradaDeConciliacion {
  /** Primer día del mes, `AAAA-MM-01`. */
  periodo: string;
  /** Los documentos vigentes del período y los que cruzan con alguna fila emitida en su mes. */
  documentos: readonly DocumentoConciliable[];
  /** Las filas emitidas en el mes y las que cruzan con algún documento del período. */
  filas: readonly FilaConciliable[];
  cobertura: CoberturaDeLaSat;
}
