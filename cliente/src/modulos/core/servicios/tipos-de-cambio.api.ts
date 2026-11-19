import { clienteHttp, type ClienteHttp } from './cliente-http';
import type { ResultadoDeConsulta } from './monedas.api';

/** Un tipo de cambio de la serie de un día (la versión vigente). Los decimales viajan como texto. */
export interface TipoDeLaSerie {
  id: string;
  moneda: string;
  fecha: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  origen: 'banguat' | 'manual';
  registradoEn: string;
}

/** Una versión de un día, con el motivo y quién la registró (solo soporte las ve). */
export interface VersionDeTipo extends TipoDeLaSerie {
  motivo: string | null;
  registradoPor: string | null;
}

export type VueltaDeCarga = 'madrugada' | 'manana' | 'noche' | 'arranque' | 'relleno' | 'manual' | 'lista' | 'muestra';

export interface ConsultaDeLaCarga {
  id: string;
  iniciadaEn: string;
  terminadaEn: string;
  operacion: string;
  vuelta: VueltaDeCarga;
  moneda: string | null;
  codigoBanguat: number | null;
  desde: string | null;
  hasta: string | null;
  resultado: ResultadoDeConsulta;
  filasNuevas: number;
  filasRechazadas: number;
  detalle: string | null;
  /** La pidió una persona y no el temporizador. */
  aPedido: boolean;
}

/** El estado de la serie de una moneda con código del Banguat. */
export interface EstadoDeLaSerie {
  moneda: string;
  nombre: string;
  codigoBanguat: number;
  activa: boolean;
  ultimaFecha: string | null;
  diasDeAtraso: number | null;
  atrasada: boolean;
}

export interface EstadoDeLaCarga {
  hoy: string;
  series: EstadoDeLaSerie[];
  consultas: ConsultaDeLaCarga[];
}

/** Lo que dejó «Cargar ahora» por moneda. */
export interface ResumenDeCarga {
  moneda: string;
  resultado: ResultadoDeConsulta;
  filasNuevas: number;
  filasRechazadas: number;
  desde: string;
  hasta: string;
}

export interface TipoManual {
  moneda: string;
  fecha: string;
  referencia: string;
  compra: string | null;
  venta: string | null;
  motivo: string;
}

/** Tipos de cambio: la serie, sus versiones, la carga del Banguat y su bitácora. */
export class ApiTiposDeCambio {
  constructor(private readonly http: ClienteHttp) {}

  serie(moneda: string, desde: string, hasta: string) {
    return this.http.obtener<TipoDeLaSerie[]>('/tipos-de-cambio', { moneda, desde, hasta });
  }

  versiones(moneda: string, fecha: string) {
    return this.http.obtener<VersionDeTipo[]>(`/tipos-de-cambio/${moneda}/${fecha}/versiones`);
  }

  registrar(datos: TipoManual) {
    return this.http.crear<VersionDeTipo>('/tipos-de-cambio', datos);
  }

  estadoDeLaCarga(limite = 50, moneda?: string) {
    return this.http.obtener<EstadoDeLaCarga>('/tipos-de-cambio/consultas', { limite, moneda });
  }

  cargarAhora(desde?: string, hasta?: string) {
    return this.http.crear<ResumenDeCarga[]>('/tipos-de-cambio/cargar', { desde, hasta });
  }
}

export const apiTiposDeCambio = new ApiTiposDeCambio(clienteHttp);
