import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type TipoDeDocumento =
  | 'factura'
  | 'factura_cambiaria'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial_recibida'
  | 'nota_de_credito'
  | 'nota_de_debito'
  | 'nota_de_abono'
  | 'recibo';
export type TipoDeIdentificacion = 'nit' | 'cui' | 'extranjero' | 'cf';
export type DestinoDeDocumento = 'cuentas-por-cobrar';
export type EstadoDeDocumento = 'vigente' | 'anulado';
export type EstadoBuscado = EstadoDeDocumento | 'todos';
export type CausaDeAnulacion = 'fel_anulada_en_la_sat' | 'error_de_captura' | 'no_corresponde_a_la_empresa';
export type ClaseFiscal = 'gravada' | 'exenta' | 'exportacion' | 'no_afecta';
export type TipoDeLinea = 'bien' | 'servicio';

/** Una fila de la lista; el dinero viaja como texto con dos decimales. */
export interface DocumentoEnLista {
  id: string;
  tipo: TipoDeDocumento;
  tipoDte: string | null;
  clienteId: string | null;
  tipoDeIdentificacion: TipoDeIdentificacion;
  nitReceptor: string;
  nombreReceptor: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  periodo: string;
  destino: DestinoDeDocumento | null;
  estado: EstadoDeDocumento;
  muestraEnReportesSat: boolean;
  documentoAfectadoId: string | null;
  total: string;
  iva: string;
  /** La cartera ya lo procesó. */
  procesado: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

export interface PaginaDeDocumentos {
  elementos: DocumentoEnLista[];
  total: number;
  pagina: number;
  limite: number;
}

export interface LineaDeLaFicha {
  id: string;
  orden: number;
  conceptoDeIngresoId: string;
  conceptoDeIngresoNombre: string;
  tipo: TipoDeLinea;
  claseFiscal: ClaseFiscal;
  descripcion: string | null;
  total: string;
  base: string;
  iva: string;
  otrosImpuestos: string;
}

export interface TotalesDeVenta {
  total: string;
  gravadoBienes: string;
  gravadoServicios: string;
  exento: string;
  exportacion: string;
  iva: string;
  otrosImpuestos: string;
}

export interface NotaDeLaFactura {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  estado: EstadoDeDocumento;
}

export interface AnulacionDeVenta {
  anuladoEn: string;
  anuladoPor: string;
  motivo: string;
  causa: CausaDeAnulacion;
  /** La de la SAT o la del día en que se anuló el registro (`AAAA-MM-DD`). */
  fecha: string;
}

export interface FacturaAnterior {
  serie: string | null;
  numero: string;
  fecha: string;
}

/** La ficha: la fila de la lista más el detalle. */
export interface FichaDeDocumento extends DocumentoEnLista {
  origen: 'manual' | 'bandeja_sat' | 'fel';
  autorizacionFel: string | null;
  localidadId: string | null;
  regimenIsrDeLaEmpresa: string | null;
  regimenIvaDeLaEmpresa: string;
  facturaAnterior: FacturaAnterior | null;
  moneda: string;
  observaciones: string | null;
  totales: TotalesDeVenta;
  lineas: LineaDeLaFicha[];
  notas: NotaDeLaFactura[];
  anulacion: AnulacionDeVenta | null;
}

/** Lo que se manda por cada línea; el total incluye el IVA y nada viene calculado. */
export interface DatosDeLinea {
  conceptoDeIngresoId: string;
  tipo: TipoDeLinea | null;
  claseFiscal: ClaseFiscal | null;
  descripcion: string | null;
  total: string;
  otrosImpuestos: string | null;
}

/** El documento tal como se manda a registrar; `destino` ausente deja que lo decida el sistema. */
export interface DatosDeDocumento {
  tipo: TipoDeDocumento;
  tipoDte: string | null;
  clienteId: string | null;
  tipoDeIdentificacion: TipoDeIdentificacion | null;
  nitReceptor: string | null;
  nombreReceptor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  fechaEmision: string;
  documentoAfectadoId: string | null;
  facturaAnterior: FacturaAnterior | null;
  destino?: DestinoDeDocumento | 'ninguno';
  ivaDelDte: string | null;
  observaciones: string | null;
  lineas: DatosDeLinea[];
}

export interface RegistroDeDocumento {
  documento: FichaDeDocumento;
  /** Lo que el usuario debe saber y no bloquea el registro. */
  avisos: string[];
}

export interface DatosDeAnulacion {
  causa: CausaDeAnulacion;
  motivo: string;
  fechaDeAnulacion?: string | null;
}

export interface ConsultaDeDocumentos {
  periodo?: string;
  clienteId?: string;
  /** Solo los de consumidor final (sin cliente). */
  sinCliente?: boolean;
  tipo?: TipoDeDocumento;
  estado?: EstadoBuscado;
  destino?: DestinoDeDocumento | 'ninguno';
  texto?: string;
  pagina?: number;
  limite?: number;
}

/** Un cliente para el filtro y el formulario. */
export interface ClienteParaVentas {
  id: string;
  nombre: string;
  nit: string | null;
  activo: boolean;
}

interface TerceroConCliente {
  nombreMostrar: string;
  nit: string | null;
  cliente: { id: string; activo: boolean } | null;
}

const RUTA = '/libro-de-ventas/documentos';

export class ApiDocumentos {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeDocumentos) {
    return this.http.obtener<PaginaDeDocumentos>(RUTA, { ...consulta });
  }

  obtener(id: string) {
    return this.http.obtener<FichaDeDocumento>(`${RUTA}/${id}`);
  }

  registrar(datos: DatosDeDocumento) {
    return this.http.crear<RegistroDeDocumento>(RUTA, datos);
  }

  anular(id: string, datos: DatosDeAnulacion) {
    return this.http.crear<RegistroDeDocumento>(`${RUTA}/${id}/anular`, datos);
  }

  /** Responde `{ avisos }`: el período puede estar declarado. */
  eliminar(id: string) {
    return this.http.eliminar<{ avisos: string[] } | undefined>(`${RUTA}/${id}`);
  }

  /** Los clientes (activos o no) de la cuenta: el filtro también debe encontrar lo vendido antes. */
  async listarClientes(): Promise<ClienteParaVentas[]> {
    const terceros = await this.http.obtener<TerceroConCliente[]>('/terceros', { papel: 'cliente' });
    return terceros.flatMap(({ nombreMostrar, nit, cliente }) =>
      cliente ? [{ id: cliente.id, nombre: nombreMostrar, nit, activo: cliente.activo }] : [],
    );
  }
}

export const apiDocumentos = new ApiDocumentos(clienteHttp);
