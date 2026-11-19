import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Un aviso no impide cerrar; lo que bloquea hay que resolverlo antes. */
export type NivelDeHallazgo = 'aviso' | 'bloquea';

export interface Hallazgo {
  nivel: NivelDeHallazgo;
  codigo: string;
  mensaje: string;
  cantidad: number;
  /** Códigos de los activos (o renglones) afectados. */
  detalle: string[];
}

export interface TotalesDelCierre {
  contable: string;
  fiscal: string;
  activosDepreciados: number;
}

/** Lo que saldrá de un mes, con la huella para que el servidor avise si algo cambió entre revisar y cerrar. */
export interface RevisionDelCierre {
  periodo: string;
  hallazgos: Hallazgo[];
  puedeCerrar: boolean;
  totales: TotalesDelCierre;
  regimenIsr: string | null;
  huella: string;
}

export interface Cierre {
  periodo: string;
  estado: 'cerrado' | 'reabierto';
  cerradoEn: string;
  cerradoPor: string;
  reabiertoEn: string | null;
  reabiertoPor: string | null;
  motivoDeReapertura: string | null;
  regimenIsr: string | null;
  totalContable: string;
  totalFiscal: string;
  activosDepreciados: number;
}

/** Los meses cerrados y cuál es el siguiente por cerrar (`null` si todavía no hay de dónde empezar). */
export interface EstadoDeDepreciacion {
  siguienteMes: string | null;
  cierres: Cierre[];
}

const RUTA = '/activos-fijos/depreciacion';

export class ApiDepreciacion {
  constructor(private readonly http: ClienteHttp) {}

  estado() {
    return this.http.obtener<EstadoDeDepreciacion>(RUTA);
  }

  revisar(periodo: string) {
    return this.http.obtener<RevisionDelCierre>(`${RUTA}/${periodo}/revision`);
  }

  cerrar(periodo: string, huella: string) {
    return this.http.crear<Cierre>(`${RUTA}/${periodo}/cerrar`, { huella });
  }

  reabrir(periodo: string, motivo: string) {
    return this.http.crear<Cierre>(`${RUTA}/${periodo}/reabrir`, { motivo });
  }
}

export const apiDepreciacion = new ApiDepreciacion(clienteHttp);
