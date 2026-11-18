import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  DatosDeAnulacionDeReintegro,
  ReciboDeReintegro,
  Reintegro,
  SolicitudDeReintegro,
} from './tipos-de-reintegros';

export type * from './tipos-de-reintegros';

const RUTA = '/cuentas-por-pagar/reintegros';

export class ApiReintegros {
  constructor(private readonly http: ClienteHttp) {}

  registrar(solicitud: SolicitudDeReintegro) {
    return this.http.crear<Reintegro>(RUTA, solicitud);
  }

  obtener(id: string) {
    return this.http.obtener<Reintegro>(`${RUTA}/${id}`);
  }

  recibo(id: string) {
    return this.http.obtener<ReciboDeReintegro>(`${RUTA}/${id}/recibo`);
  }

  anular(id: string, datos: DatosDeAnulacionDeReintegro) {
    return this.http.crear<Reintegro>(`${RUTA}/${id}/anular`, datos);
  }
}

export const apiReintegros = new ApiReintegros(clienteHttp);
