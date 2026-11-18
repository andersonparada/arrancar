import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  FormaDePagoNuevo,
  MediosDePago,
  NotaParaLigar,
  PagoRegistrado,
  PaginaDeProveedoresPorPagar,
  ParaPagar,
  SolicitudDePago,
} from './tipos-de-pagos';

export type * from './tipos-de-pagos';

const RUTA = '/cuentas-por-pagar';

/** Cada forma tiene su ruta (y su permiso en el servidor). */
const RUTA_POR_FORMA: Record<FormaDePagoNuevo, string> = {
  cheque: `${RUTA}/pagos`,
  nota_de_debito: `${RUTA}/pagos`,
  nota_ligada: `${RUTA}/pagos/ligar`,
  cuenta_de_apertura: `${RUTA}/pagos/apertura`,
};

export class ApiPagos {
  constructor(private readonly http: ClienteHttp) {}

  /** Los proveedores con algo autorizado por pagar, para elegir a quién se paga. */
  proveedoresPorPagar() {
    return this.http.obtener<PaginaDeProveedoresPorPagar>(`${RUTA}/pagos/proveedores-por-pagar`, { limite: 200 });
  }

  /** Lo que se puede pagar del proveedor; `contrasenaId` es la que se abre primero y `fecha` fija el mes de la suma. */
  paraPagar(proveedorId: string, filtro: { contrasenaId?: string; fecha?: string } = {}) {
    return this.http.obtener<ParaPagar>(`${RUTA}/proveedores/${proveedorId}/para-pagar`, { ...filtro });
  }

  medios(fecha?: string) {
    return this.http.obtener<MediosDePago>(`${RUTA}/pagos/medios`, fecha ? { fecha } : {});
  }

  notasParaLigar() {
    return this.http.obtener<{ elementos: NotaParaLigar[] }>(`${RUTA}/pagos/notas-para-ligar`);
  }

  registrar(solicitud: SolicitudDePago) {
    return this.http.crear<PagoRegistrado>(RUTA_POR_FORMA[solicitud.forma], solicitud);
  }
}

export const apiPagos = new ApiPagos(clienteHttp);
