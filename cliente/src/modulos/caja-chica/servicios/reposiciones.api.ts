import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  AnulacionSolicitada,
  Reposicion,
  ReposicionResumen,
  ReposicionSolicitada,
  SolicitudDeReposicion,
} from './tipos-de-reposiciones';

const RUTA = '/caja-chica';

/** Las reposiciones del fondo: lo pendiente, reponer, la ficha para imprimir y anular. */
export class ApiReposiciones {
  constructor(private readonly http: ClienteHttp) {}

  delFondo(fondoId: string) {
    return this.http.obtener<ReposicionResumen[]>(`${RUTA}/fondos/${fondoId}/reposiciones`);
  }

  solicitud(fondoId: string) {
    return this.http.obtener<SolicitudDeReposicion>(`${RUTA}/fondos/${fondoId}/solicitud-de-reposicion`);
  }

  obtener(id: string) {
    return this.http.obtener<Reposicion>(`${RUTA}/reposiciones/${id}`);
  }

  registrar(fondoId: string, datos: ReposicionSolicitada) {
    return this.http.crear<Reposicion>(`${RUTA}/fondos/${fondoId}/reposiciones`, datos);
  }

  anular(id: string, datos: AnulacionSolicitada) {
    return this.http.crear<Reposicion>(`${RUTA}/reposiciones/${id}/anular`, datos);
  }
}

export const apiReposiciones = new ApiReposiciones(clienteHttp);
