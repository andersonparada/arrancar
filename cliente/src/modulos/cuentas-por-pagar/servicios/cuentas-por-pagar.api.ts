import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  Bandeja,
  CondicionesDeProveedor,
  ConsultaDeDocumentos,
  DatosDeAnulacion,
  DocumentoACompletar,
  DocumentoPorPagar,
  FichaDelDocumento,
  PaginaDeDocumentos,
  ProveedorParaFiltro,
  SaldoDelProveedor,
} from './tipos';

export type * from './tipos';

const RUTA = '/cuentas-por-pagar';
const RUTA_DE_DOCUMENTOS = `${RUTA}/documentos`;

interface TerceroConProveedor {
  nombreMostrar: string;
  proveedor: { id: string } | null;
}

export class ApiCuentasPorPagar {
  constructor(private readonly http: ClienteHttp) {}

  obtenerCondiciones(proveedorId: string) {
    return this.http.obtener<CondicionesDeProveedor>(`${RUTA}/proveedores/${proveedorId}/condiciones`);
  }

  obtenerSaldoDelProveedor(proveedorId: string) {
    return this.http.obtener<SaldoDelProveedor>(`${RUTA}/proveedores/${proveedorId}/saldo`);
  }

  verBandeja() {
    return this.http.obtener<Bandeja>(`${RUTA}/bandeja`);
  }

  listar(consulta: ConsultaDeDocumentos) {
    return this.http.obtener<PaginaDeDocumentos>(RUTA_DE_DOCUMENTOS, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<FichaDelDocumento>(`${RUTA_DE_DOCUMENTOS}/${id}`);
  }

  completar(documentos: DocumentoACompletar[]) {
    return this.http.crear<DocumentoPorPagar[]>(`${RUTA_DE_DOCUMENTOS}/registrar`, { documentos });
  }

  autorizar(ids: string[]) {
    return this.http.crear<DocumentoPorPagar[]>(`${RUTA_DE_DOCUMENTOS}/autorizar`, { ids });
  }

  desautorizar(id: string, motivo: string) {
    return this.http.crear<DocumentoPorPagar>(`${RUTA_DE_DOCUMENTOS}/${id}/desautorizar`, { motivo });
  }

  cambiarVencimiento(id: string, vencimiento: string) {
    return this.http.modificar<DocumentoPorPagar>(`${RUTA_DE_DOCUMENTOS}/${id}`, { vencimiento });
  }

  anular(id: string, datos: DatosDeAnulacion) {
    return this.http.crear<DocumentoPorPagar>(`${RUTA_DE_DOCUMENTOS}/${id}/anular`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA_DE_DOCUMENTOS}/${id}`);
  }

  /** Los proveedores (activos o no) de la cuenta, para el filtro de la lista. */
  async listarProveedores(): Promise<ProveedorParaFiltro[]> {
    const terceros = await this.http.obtener<TerceroConProveedor[]>('/terceros', { papel: 'proveedor' });
    return terceros.flatMap(({ nombreMostrar, proveedor }) =>
      proveedor ? [{ id: proveedor.id, nombre: nombreMostrar }] : [],
    );
  }
}

export const apiCuentasPorPagar = new ApiCuentasPorPagar(clienteHttp);
