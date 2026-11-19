import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { LiquidacionSolicitada, Vale, ValeResumen, ValeSolicitado } from './tipos-de-vales';

const RUTA = '/caja-chica';

/** Los vales provisionales del fondo: entregar, liquidar con comprobantes, la ficha para imprimir y anular. */
export class ApiValesProvisionales {
  constructor(private readonly http: ClienteHttp) {}

  delFondo(fondoId: string) {
    return this.http.obtener<ValeResumen[]>(`${RUTA}/fondos/${fondoId}/vales-provisionales`);
  }

  obtener(id: string) {
    return this.http.obtener<Vale>(`${RUTA}/vales-provisionales/${id}`);
  }

  entregar(fondoId: string, datos: ValeSolicitado) {
    return this.http.crear<Vale>(`${RUTA}/fondos/${fondoId}/vales-provisionales`, datos);
  }

  liquidar(id: string, datos: LiquidacionSolicitada) {
    return this.http.crear<Vale>(`${RUTA}/vales-provisionales/${id}/liquidar`, datos);
  }

  anular(id: string, motivo: string) {
    return this.http.crear<Vale>(`${RUTA}/vales-provisionales/${id}/anular`, { motivo });
  }
}

export const apiValesProvisionales = new ApiValesProvisionales(clienteHttp);
