import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  Comprobante,
  DisputaSolicitada,
  ComprobanteDeLaBandeja,
  DocumentoPorAsignar,
  EstadoDeLosComprobantes,
  FiltroDeBandeja,
  ListaDeComprobantes,
  ResultadoDeAsignar,
  SalidaSolicitada,
  ValeDeGastoSolicitado,
} from './tipos-de-comprobantes';

const RUTA = '/caja-chica';

/** La bandeja, los comprobantes de un fondo y sus acciones (asignar, devolver, vales de gasto, anular) y lo del documento anulado por su emisor. */
export class ApiComprobantes {
  constructor(private readonly http: ClienteHttp) {}

  bandeja(filtro: FiltroDeBandeja = {}) {
    return this.http.obtener<ComprobanteDeLaBandeja[]>(`${RUTA}/bandeja`, filtro as Record<string, string | boolean>);
  }

  delFondo(fondoId: string, estado: EstadoDeLosComprobantes = 'pendiente') {
    return this.http.obtener<ListaDeComprobantes>(`${RUTA}/fondos/${fondoId}/comprobantes`, { estado });
  }

  asignar(fondoId: string, documentos: DocumentoPorAsignar[]) {
    return this.http.crear<ResultadoDeAsignar>(`${RUTA}/fondos/${fondoId}/comprobantes/documentos`, { documentos });
  }

  registrarVale(fondoId: string, vale: ValeDeGastoSolicitado) {
    return this.http.crear<ResultadoDeAsignar>(`${RUTA}/fondos/${fondoId}/vales-de-gasto`, vale);
  }

  devolver(id: string, motivo: string) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/devolver-a-la-bandeja`, { motivo });
  }

  anular(id: string, motivo: string) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/anular`, { motivo });
  }

  resolverDocumentoAnulado(id: string, salida: SalidaSolicitada) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/documento-anulado/resolver`, salida);
  }

  reemplazarDocumentoAnulado(id: string, cuerpo: { reemplazoId: string; motivo: string }) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/documento-anulado/reemplazar`, cuerpo);
  }

  ponerEnDisputa(id: string, disputa: DisputaSolicitada) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/documento-anulado/disputa`, disputa);
  }

  retirarDeLaDisputa(id: string, motivo: string) {
    return this.http.crear<Comprobante>(`${RUTA}/comprobantes/${id}/documento-anulado/retirar-disputa`, { motivo });
  }
}

export const apiComprobantes = new ApiComprobantes(clienteHttp);
