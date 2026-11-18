import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  ComprobanteDePago,
  ConsultaDePagos,
  FichaDePago,
  PaginaDePagos,
  SolicitudDeAnulacion,
  SolicitudDeDiferencia,
  SolicitudDeReaplicacion,
} from './tipos-de-consulta-de-pagos';
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

/** El máximo que el servidor deja pedir de una vez. */
export const LIMITE_DE_PAGINA = 200;

/** Cada forma tiene su ruta (y su permiso en el servidor). */
const RUTA_POR_FORMA: Record<FormaDePagoNuevo, string> = {
  cheque: `${RUTA}/pagos`,
  nota_de_debito: `${RUTA}/pagos`,
  nota_ligada: `${RUTA}/pagos/ligar`,
  cuenta_de_apertura: `${RUTA}/pagos/apertura`,
};

export class ApiPagos {
  constructor(private readonly http: ClienteHttp) {}

  /** Los proveedores con algo autorizado por pagar (los que lleven `buscar` en el nombre), para elegir a quién se paga. */
  proveedoresPorPagar(pagina = 1, buscar = '') {
    return this.http.obtener<PaginaDeProveedoresPorPagar>(`${RUTA}/pagos/proveedores-por-pagar`, {
      pagina,
      limite: LIMITE_DE_PAGINA,
      ...(buscar ? { buscar } : {}),
    });
  }

  /** Lo que se puede pagar del proveedor; `contrasenaId` es la que se abre primero y `fecha` fija el mes de la suma. */
  paraPagar(proveedorId: string, filtro: { contrasenaId?: string; fecha?: string } = {}) {
    return this.http.obtener<ParaPagar>(`${RUTA}/proveedores/${proveedorId}/para-pagar`, { ...filtro });
  }

  medios(fecha?: string) {
    return this.http.obtener<MediosDePago>(`${RUTA}/pagos/medios`, fecha ? { fecha } : {});
  }

  /** Las más recientes con algo disponible (acotadas por cuenta y fechas), hasta el máximo del servidor. */
  notasParaLigar(filtro: Record<string, string> = {}) {
    return this.http.obtener<{ elementos: NotaParaLigar[] }>(`${RUTA}/pagos/notas-para-ligar`, {
      ...filtro,
      limite: LIMITE_DE_PAGINA,
    });
  }

  registrar(solicitud: SolicitudDePago) {
    return this.http.crear<PagoRegistrado>(RUTA_POR_FORMA[solicitud.forma], solicitud);
  }

  listar(consulta: ConsultaDePagos) {
    return this.http.obtener<PaginaDePagos>(`${RUTA}/pagos`, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<FichaDePago>(`${RUTA}/pagos/${id}`);
  }

  comprobante(id: string) {
    return this.http.obtener<ComprobanteDePago>(`${RUTA}/pagos/${id}/comprobante`);
  }

  anular(id: string, solicitud: SolicitudDeAnulacion) {
    return this.http.crear<PagoRegistrado>(`${RUTA}/pagos/${id}/anular`, solicitud);
  }

  reaplicar(id: string, solicitud: SolicitudDeReaplicacion) {
    return this.http.crear<PagoRegistrado>(`${RUTA}/pagos/${id}/reaplicar`, solicitud);
  }

  saldarDiferencia(id: string, solicitud: SolicitudDeDiferencia) {
    return this.http.crear<PagoRegistrado>(`${RUTA}/pagos/${id}/diferencias`, solicitud);
  }
}

export const apiPagos = new ApiPagos(clienteHttp);
