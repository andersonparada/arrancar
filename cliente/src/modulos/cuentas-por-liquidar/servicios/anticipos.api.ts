import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  Anticipo,
  ConsultaDeAnticipos,
  PaginaDeAnticipos,
  SolicitudDeCambioDeAnticipo,
  SolicitudDeEntrega,
  SolicitudDeLiquidacion,
} from './tipos-de-anticipos';

export type * from './tipos-de-anticipos';

const RUTA = '/cuentas-por-liquidar/anticipos';

/** Los anticipos: lista con fecha de corte, entrega, liquidación, reapertura y anulación. */
export class ApiAnticipos {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeAnticipos) {
    return this.http.obtener<PaginaDeAnticipos>(RUTA, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<Anticipo>(`${RUTA}/${id}`);
  }

  entregar(solicitud: SolicitudDeEntrega) {
    return this.http.crear<Anticipo>(RUTA, solicitud);
  }

  anular(id: string, solicitud: SolicitudDeCambioDeAnticipo) {
    return this.http.crear<Anticipo>(`${RUTA}/${id}/anular`, solicitud);
  }

  liquidar(id: string, solicitud: SolicitudDeLiquidacion) {
    return this.http.crear<Anticipo>(`${RUTA}/${id}/liquidar`, solicitud);
  }

  reabrir(id: string, solicitud: SolicitudDeCambioDeAnticipo) {
    return this.http.crear<Anticipo>(`${RUTA}/${id}/reabrir`, solicitud);
  }
}

export const apiAnticipos = new ApiAnticipos(clienteHttp);
