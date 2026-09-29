import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Quién, cuándo y por qué se eliminó o cambió de tipo el comprobante que tenía un número. */
export interface ExplicacionDeHueco {
  accion: 'eliminar' | 'corregir';
  usuarioId: string | null;
  usuarioNombre: string | null;
  fecha: string;
  motivo: string | null;
}

/** Un número que falta: `explicado` si la auditoría dice qué pasó; `alerta` si no hay rastro. */
export interface Hueco {
  numero: number;
  estado: 'explicado' | 'alerta';
  explicaciones: ExplicacionDeHueco[];
}

/** El correlativo de una clave (y de un año, si la empresa lo reinicia): hasta dónde llegó y qué números faltan. */
export interface Correlativo {
  clave: string;
  nombre: string;
  /** 0 si el correlativo no se reinicia cada año. */
  anio: number;
  ultimo: number;
  emitidos: number;
  huecos: Hueco[];
}

export interface ReporteDeCorrelativos {
  correlativos: Correlativo[];
}

/** Las claves de correlativo de Bancos que se pueden filtrar. */
export type ClaveDeCorrelativo = 'bancos.notas_de_credito' | 'bancos.notas_de_debito' | 'bancos.transferencias';

/** Qué correlativo consultar; sin clave, todos. */
export interface FiltroDeCorrelativos {
  clave?: ClaveDeCorrelativo;
  [clave: string]: string | undefined;
}

const RUTA = '/bancos/correlativos';

/** Correlativos es de solo lectura: el reporte de los huecos de la numeración, y su Excel. */
export class ApiCorrelativos {
  constructor(private readonly http: ClienteHttp) {}

  /** Solo exportar (es reporte), con el mismo filtro que la pantalla. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  reporte(filtro: FiltroDeCorrelativos = {}) {
    return this.http.obtener<ReporteDeCorrelativos>(RUTA, filtro);
  }
}

export const apiCorrelativos = new ApiCorrelativos(clienteHttp);
