import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  DestinoDeDocumento,
  FichaDeDocumento,
  MotivoFueraDelLibro,
  PaginaDeDocumentos,
  TipoDeDocumento,
} from './documentos.api';

export interface LineaSolicitada {
  conceptoId: string;
  descripcion: string | null;
  tipo: 'bien' | 'servicio' | null;
  esActivoFijo: boolean | null;
  combustibleId: string | null;
  galones: string | null;
  total: string;
  exento: string | null;
}

/** El monto final de una retención propuesta, cuando el usuario la cambió. */
export interface AjusteSolicitado {
  regla: string;
  monto: string;
  motivo: string | null;
}

/** Lo que se contestó de un proveedor sin datos fiscales guardados. */
export interface DatosFiscalesContestados {
  /** Si no llega, el servidor lo deduce (no domiciliado o general). */
  regimenIva?: string;
  regimenIsr: string;
  esAgenteDeRetencionIva: boolean;
}

/** El cuerpo de calcular y de registrar un documento; el dinero viaja como texto. */
export interface SolicitudDeDocumento {
  tipo: TipoDeDocumento;
  proveedorId: string;
  destino: DestinoDeDocumento;
  nitEmisor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  nitReceptor: string | null;
  motivoFueraDelLibro: MotivoFueraDelLibro | null;
  noVinculado: boolean;
  fechaEmision: string;
  fechaRecepcion: string | null;
  periodo: string | null;
  documentoAfectadoId: string | null;
  ivaDeLaFel: string | null;
  observaciones: string | null;
  lineas: LineaSolicitada[];
  ajustesDeRetenciones: AjusteSolicitado[];
  datosFiscalesDelProveedor: DatosFiscalesContestados | null;
  confirmarCambioDeRegimen: boolean;
}

/** El documento calculado o registrado; en la vista previa todavía no tiene `id`. */
export type DocumentoCalculado = Pick<
  FichaDeDocumento,
  | 'tipo'
  | 'fechaRecepcion'
  | 'periodo'
  | 'muestraEnReportesSat'
  | 'motivoFueraDelLibro'
  | 'motivoSinCredito'
  | 'totales'
  | 'netoAPagar'
  | 'lineas'
  | 'retenciones'
> & { id: string | null };

/** Lo que responden calcular y registrar: el documento y los avisos que no bloquean. */
export interface RespuestaDeDocumento {
  documento: DocumentoCalculado;
  avisos: string[];
}

export interface DestinoDisponible {
  clave: DestinoDeDocumento;
}

/** Un proveedor activo al que se le puede registrar un documento. */
export interface ProveedorParaRegistro {
  id: string;
  nombre: string;
  nit: string | null;
}

interface TerceroConProveedor {
  nombreMostrar: string;
  nit: string | null;
  activo: boolean;
  proveedor: { id: string; activo: boolean } | null;
}

const RUTA = '/libro-de-compras/documentos';
const FACTURAS_QUE_SE_OFRECEN = 200;

export class ApiRegistroDeDocumentos {
  constructor(private readonly http: ClienteHttp) {}

  /** Vista previa: no guarda nada. */
  calcular(cuerpo: SolicitudDeDocumento) {
    return this.http.crear<RespuestaDeDocumento>(`${RUTA}/calcular`, cuerpo);
  }

  registrar(cuerpo: SolicitudDeDocumento) {
    return this.http.crear<RespuestaDeDocumento>(RUTA, cuerpo);
  }

  /** Los destinos con su módulo activo; vacío mientras no haya ninguno instalado. */
  destinos() {
    return this.http.obtener<DestinoDisponible[]>('/libro-de-compras/destinos');
  }

  /** El destino del último documento de ese proveedor, o `null` si es el primero. */
  destinoSugerido(proveedorId: string) {
    return this.http.obtener<{ destino: DestinoDeDocumento | null }>(
      `/libro-de-compras/proveedores/${proveedorId}/destino-sugerido`,
    );
  }

  /** Los proveedores activos de la cuenta. */
  async proveedores(): Promise<ProveedorParaRegistro[]> {
    const terceros = await this.http.obtener<TerceroConProveedor[]>('/terceros', { papel: 'proveedor' });
    return terceros.flatMap(({ nombreMostrar, nit, activo, proveedor }) =>
      proveedor?.activo && activo ? [{ id: proveedor.id, nombre: nombreMostrar, nit }] : [],
    );
  }

  /** Los documentos vigentes de un proveedor, de los que una nota de crédito puede rebajar las facturas. */
  documentosVigentesDelProveedor(proveedorId: string) {
    return this.http.obtener<PaginaDeDocumentos>(RUTA, {
      proveedorId,
      estado: 'vigente',
      limite: FACTURAS_QUE_SE_OFRECEN,
    });
  }
}

export const apiRegistroDeDocumentos = new ApiRegistroDeDocumentos(clienteHttp);
