import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  AnulacionDeAperturaSolicitada,
  AperturaSolicitada,
  AumentoSolicitado,
  CierreSolicitado,
  CustodioSolicitado,
  DisminucionSolicitada,
  EdicionSolicitada,
  FiltroDeFondos,
  Fondo,
  PaginaDeFondos,
} from './tipos-de-fondos';

const RUTA = '/caja-chica/fondos';

/** Los fondos de Caja chica: solo los que el usuario tiene asignados (o todos con `ver-todos`). */
export class ApiFondos {
  constructor(private readonly http: ClienteHttp) {}

  listar(filtro: FiltroDeFondos) {
    return this.http.obtener<PaginaDeFondos>(RUTA, { ...filtro, limite: 200 });
  }

  obtener(id: string) {
    return this.http.obtener<Fondo>(`${RUTA}/${id}`);
  }

  abrir(datos: AperturaSolicitada) {
    return this.http.crear<Fondo>(RUTA, datos);
  }

  editar(id: string, datos: EdicionSolicitada) {
    return this.http.modificar<Fondo>(`${RUTA}/${id}`, datos);
  }

  cambiarCustodio(id: string, datos: CustodioSolicitado) {
    return this.http.crear<Fondo>(`${RUTA}/${id}/custodio`, datos);
  }

  aumentar(id: string, datos: AumentoSolicitado) {
    return this.http.crear<Fondo>(`${RUTA}/${id}/aumentar`, datos);
  }

  disminuir(id: string, datos: DisminucionSolicitada) {
    return this.http.crear<Fondo>(`${RUTA}/${id}/disminuir`, datos);
  }

  cerrar(id: string, datos: CierreSolicitado) {
    return this.http.crear<Fondo>(`${RUTA}/${id}/cerrar`, datos);
  }

  anularApertura(id: string, datos: AnulacionDeAperturaSolicitada) {
    return this.http.crear<Fondo>(`${RUTA}/${id}/anular-apertura`, datos);
  }
}

export const apiFondos = new ApiFondos(clienteHttp);
