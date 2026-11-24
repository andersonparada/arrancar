import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type AgenteDeRetencionDeIvaDeCliente =
  'ninguno' | 'exportador' | 'contribuyente_especial' | 'sector_publico' | 'otro';

/** Datos fiscales de un cliente para ventas; `guardado` es falso si el servidor devuelve los valores por omisión. */
export interface DatosFiscalesDeCliente {
  clienteId: string;
  guardado: boolean;
  agenteDeRetencionIva: AgenteDeRetencionDeIvaDeCliente;
  exportaProductosAgropecuarios: boolean;
  retieneIsr: boolean;
  retieneIvaAPequenoContribuyente: boolean;
}

export class ApiDatosFiscalesDeCliente {
  constructor(private readonly http: ClienteHttp) {}

  obtener(clienteId: string) {
    return this.http.obtener<DatosFiscalesDeCliente>(`/libro-de-ventas/clientes/${clienteId}/datos-fiscales`);
  }
}

export const apiDatosFiscalesDeCliente = new ApiDatosFiscalesDeCliente(clienteHttp);
