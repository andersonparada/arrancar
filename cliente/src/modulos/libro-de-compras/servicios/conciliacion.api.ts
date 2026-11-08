import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { EstadoDeDte, MotivoDeBloqueo } from './dte-recibidos.api';

/** Los resultados posibles de conciliar un período, en el orden en que la pantalla los muestra. */
export type ClaveDeResultado =
  | 'cuadra'
  | 'conDiferencias'
  | 'enLaSatYNoEnArrancar'
  | 'enArrancarYNoEnLaSat'
  | 'sinDatosDeLaSat'
  | 'registradoEnOtroPeriodo'
  | 'noVaEnElLibro'
  | 'anuladoEnLaSatYVigenteAqui'
  | 'descartado';

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

/** Un dato que no coincide; manda el de la SAT. */
export interface DiferenciaDeConciliacion {
  campo: CampoComparado;
  arrancar: string | null;
  sat: string | null;
}

/** Una línea de cualquiera de los resultados; lo que no aplica a ese resultado viene en `null`. */
export interface ItemDeConciliacion {
  autorizacionFel: string | null;
  tipoDte: string | null;
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

/** La conciliación de un período: los conteos para las tarjetas y la lista de cada resultado. */
export interface ConciliacionDelPeriodo {
  /** Primer día del mes, `AAAA-MM-01`. */
  periodo: string;
  /** Falso cuando ningún archivo de la SAT toca el mes del período. */
  hayDatosDeLaSat: boolean;
  resumen: Record<ClaveDeResultado, number>;
  resultados: Record<ClaveDeResultado, ItemDeConciliacion[]>;
}

/** Cruza los documentos de un período con la bandeja de la SAT; es una consulta, no guarda nada. */
export class ApiConciliacion {
  constructor(private readonly http: ClienteHttp) {}

  obtener(periodo: string) {
    return this.http.obtener<ConciliacionDelPeriodo>('/libro-de-compras/dte-recibidos/conciliacion', { periodo });
  }
}

export const apiConciliacion = new ApiConciliacion(clienteHttp);
