import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  ConsultaDeRetiros,
  PaginaDeRetiros,
  RepartoRegistrado,
  Retiro,
  SolicitudDeCambioDeRetiro,
  SolicitudDeLiquidacion,
  SolicitudDeReparto,
  SolicitudDeRetiro,
} from './tipos-de-retiros';

export type * from './tipos-de-retiros';

const RUTA = '/cuentas-por-pagar/retiros';

/** Los retiros de efectivo para pagos y el reparto de su efectivo entre proveedores. */
export class ApiRetiros {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeRetiros) {
    return this.http.obtener<PaginaDeRetiros>(RUTA, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<Retiro>(`${RUTA}/${id}`);
  }

  registrar(solicitud: SolicitudDeRetiro) {
    return this.http.crear<Retiro>(RUTA, solicitud);
  }

  repartir(id: string, solicitud: SolicitudDeReparto) {
    return this.http.crear<RepartoRegistrado>(`${RUTA}/${id}/pagos`, solicitud);
  }

  liquidar(id: string, solicitud: SolicitudDeLiquidacion) {
    return this.http.crear<Retiro>(`${RUTA}/${id}/liquidar`, solicitud);
  }

  reabrir(id: string, solicitud: SolicitudDeCambioDeRetiro) {
    return this.http.crear<Retiro>(`${RUTA}/${id}/reabrir`, solicitud);
  }

  anular(id: string, solicitud: SolicitudDeCambioDeRetiro) {
    return this.http.crear<Retiro>(`${RUTA}/${id}/anular`, solicitud);
  }
}

export const apiRetiros = new ApiRetiros(clienteHttp);
