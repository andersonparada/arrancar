import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type TipoDeDocumento =
  | 'factura'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial'
  | 'nota_de_credito'
  | 'recibo';
export type DestinoDeDocumento = 'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar';
export type EstadoDeDocumento = 'vigente' | 'anulado';
export type EstadoBuscado = EstadoDeDocumento | 'todos';
export type CausaDeAnulacion = 'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa';
export type MotivoSinCredito =
  | 'empresa_sin_credito'
  | 'fuera_de_plazo'
  | 'no_vinculado'
  | 'pequeno_contribuyente'
  | 'exento'
  | 'contribuyente_agropecuario'
  | 'primario_pecuario';
export type MotivoFueraDelLibro = 'sin_fel' | 'fel_a_consumidor_final' | 'fel_a_otro_nit';

/** Una fila de la lista; el dinero viaja como texto con dos decimales. */
export interface DocumentoEnLista {
  id: string;
  tipo: TipoDeDocumento;
  /** El código DTE de la FEL («FACT», «FAPE»…); opcional mientras el servidor no lo envíe en la lista. */
  tipoDte?: string | null;
  proveedorId: string;
  nombreEmisor: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  destino: DestinoDeDocumento;
  estado: EstadoDeDocumento;
  muestraEnReportesSat: boolean;
  documentoAfectadoId: string | null;
  total: string;
  retenido: string;
  netoAPagar: string;
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

/** Lo que se pide al servidor; lo que falta no filtra. */
export interface ConsultaDeDocumentos {
  periodo?: string;
  proveedorId?: string;
  estado?: EstadoBuscado;
  destino?: DestinoDeDocumento;
  tipo?: TipoDeDocumento;
  pagina?: number;
  limite?: number;
  [clave: string]: string | number | undefined;
}

export interface LineaDeDocumento {
  numero: number;
  conceptoId: string;
  descripcion: string | null;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  combustible: { vigenciaDeCombustibleId: string; galones: string; idpPorGalon: string } | null;
  total: string;
  exento: string;
  idp: string;
  base: string;
  iva: string;
  ivaNoAcreditable: string;
  costo: string;
}

export interface RetencionDeDocumento {
  impuesto: 'iva' | 'isr';
  regla: string;
  base: string;
  porcentaje: string | null;
  montoPropuesto: string;
  monto: string;
  motivoDelAjuste: string | null;
  fecha: string;
}

export interface TotalesDeDocumento {
  total: string;
  base: string;
  iva: string;
  ivaNoAcreditable: string;
  idp: string;
  exento: string;
}

export interface NotaDeFactura {
  id: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  estado: EstadoDeDocumento;
}

/** La ficha de un documento: todo lo registrado y lo que se puede hacer con él. */
export interface FichaDeDocumento {
  id: string;
  tipo: TipoDeDocumento;
  /** El código DTE de la FEL; si viene, la ficha lo muestra como «Código SAT». */
  tipoDte?: string | null;
  proveedorId: string;
  nitEmisor: string | null;
  nombreEmisor: string;
  nitReceptor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  muestraEnReportesSat: boolean;
  motivoFueraDelLibro: MotivoFueraDelLibro | null;
  motivoSinCredito: MotivoSinCredito | null;
  /** Solo en notas de crédito: el motivo sin crédito de la factura que rebajan (opcional hasta que el servidor lo envíe). */
  motivoDeLaFactura?: MotivoSinCredito | null;
  documentoAfectadoId: string | null;
  destino: DestinoDeDocumento;
  observaciones: string | null;
  totales: TotalesDeDocumento;
  netoAPagar: string;
  lineas: LineaDeDocumento[];
  retenciones: RetencionDeDocumento[];
  estado: EstadoDeDocumento;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  causaDeAnulacion: CausaDeAnulacion | null;
  procesadoEnDestinoEn: string | null;
  notas: NotaDeFactura[];
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

export interface DatosDeAnulacion {
  causa: CausaDeAnulacion;
  motivo: string;
}

/** Lo que responde anular: la ficha ya anulada y los avisos que no bloquean. */
export interface RespuestaDeAnulacion {
  documento: FichaDeDocumento;
  avisos: string[];
}

export interface RespuestaDeEliminacion {
  avisos: string[];
}

/** Un proveedor de la cuenta, para el filtro de la lista. */
export interface ProveedorParaFiltro {
  id: string;
  nombre: string;
}

interface TerceroConProveedor {
  nombreMostrar: string;
  proveedor: { id: string } | null;
}

const RUTA = '/libro-de-compras/documentos';

export class ApiDocumentos {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeDocumentos) {
    return this.http.obtener<PaginaDeDocumentos>(RUTA, consulta);
  }

  obtener(id: string) {
    return this.http.obtener<FichaDeDocumento>(`${RUTA}/${id}`);
  }

  anular(id: string, datos: DatosDeAnulacion) {
    return this.http.crear<RespuestaDeAnulacion>(`${RUTA}/${id}/anular`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar<RespuestaDeEliminacion>(`${RUTA}/${id}`);
  }

  /** Los proveedores (activos o no) de la cuenta: el filtro también debe encontrar lo registrado antes. */
  async listarProveedores(): Promise<ProveedorParaFiltro[]> {
    const terceros = await this.http.obtener<TerceroConProveedor[]>('/terceros', { papel: 'proveedor' });
    return terceros.flatMap(({ nombreMostrar, proveedor }) =>
      proveedor ? [{ id: proveedor.id, nombre: nombreMostrar }] : [],
    );
  }
}

export const apiDocumentos = new ApiDocumentos(clienteHttp);
