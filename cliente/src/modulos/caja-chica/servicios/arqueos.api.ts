import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { Arqueo, ArqueoResumen, ArqueoSolicitado, PropuestaDeArqueo } from './tipos-de-arqueos';

const RUTA = '/caja-chica';

/** Los arqueos del fondo: lo que se espera, registrar, el acta para imprimir y anular. */
export class ApiArqueos {
  constructor(private readonly http: ClienteHttp) {}

  delFondo(fondoId: string) {
    return this.http.obtener<ArqueoResumen[]>(`${RUTA}/fondos/${fondoId}/arqueos`);
  }

  propuesta(fondoId: string) {
    return this.http.obtener<PropuestaDeArqueo>(`${RUTA}/fondos/${fondoId}/arqueos/propuesta`);
  }

  obtener(id: string) {
    return this.http.obtener<Arqueo>(`${RUTA}/arqueos/${id}`);
  }

  registrar(fondoId: string, datos: ArqueoSolicitado) {
    return this.http.crear<Arqueo>(`${RUTA}/fondos/${fondoId}/arqueos`, datos);
  }

  anular(id: string, motivo: string) {
    return this.http.crear<Arqueo>(`${RUTA}/arqueos/${id}/anular`, { motivo });
  }
}

export const apiArqueos = new ApiArqueos(clienteHttp);
