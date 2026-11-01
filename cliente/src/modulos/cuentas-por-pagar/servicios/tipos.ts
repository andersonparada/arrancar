export type TipoDeDocumento =
  | 'factura'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial'
  | 'nota_de_credito'
  | 'nota_de_debito'
  | 'recibo';

export type ClaseDeDocumento = 'cargo' | 'abono';
export type EstadoDeDocumento = 'pendiente' | 'registrado' | 'autorizado' | 'anulado';
export type EstadoBuscado = EstadoDeDocumento | 'vigente' | 'todos';
export type CausaDeAnulacion = 'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa';

/** Las condiciones de pago de un proveedor; `diasDeCredito` nulo es el plazo por omisión (un mes). */
export interface CondicionesDeProveedor {
  diasDeCredito: number | null;
  contarDesdeLaRecepcion: boolean;
}

/** Lo que el servidor dice que se puede hacer con un documento (el permiso del usuario se revisa aparte). */
export interface AccionesDelDocumento {
  puedeRegistrar: boolean;
  puedeAutorizar: boolean;
  puedeDesautorizar: boolean;
  puedeCambiarVencimiento: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

/** Un documento tal como lo ven la bandeja, la lista y la ficha; el dinero viaja como texto. */
export interface DocumentoPorPagar extends AccionesDelDocumento {
  id: string;
  /** El id del documento en Libro de compras. */
  documentoId: string;
  tipo: TipoDeDocumento;
  clase: ClaseDeDocumento;
  estado: EstadoDeDocumento;
  proveedorId: string;
  proveedorNombre: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  fechaRecepcion: string;
  periodo: string;
  vencimiento: string | null;
  vencido: boolean;
  documentoAfectadoId: string | null;
  tieneActivoFijo: boolean;
  total: string;
  retenciones: string;
  neto: string;
  aplicado: string;
  saldo: string;
  /** El usuario lo ingresó en Libro de compras o lo completó: para autorizarlo necesita `autorizar-propios`. */
  esPropio: boolean;
  registradoEn: string | null;
  autorizadoEn: string | null;
  autorizacionPropia: boolean;
}

export interface PaginaDeDocumentos {
  elementos: DocumentoPorPagar[];
  total: number;
  pagina: number;
  limite: number;
}

export interface Bandeja {
  elementos: DocumentoPorPagar[];
  /** Si pasa de `elementos`, la bandeja se recortó. */
  total: number;
}

export interface NotaDelDocumento {
  id: string;
  documentoId: string;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  aplicadoAEsteDocumento: string;
}

export interface AplicacionDelDocumento {
  notaId: string;
  notaSerie: string | null;
  notaNumero: string;
  cargoId: string;
  cargoSerie: string | null;
  cargoNumero: string;
  monto: string;
}

export interface FichaDelDocumento extends DocumentoPorPagar {
  notas: NotaDelDocumento[];
  aplicaciones: AplicacionDelDocumento[];
}

export interface SaldoDeudor {
  id: string;
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibre: string;
}

/** Lo que la empresa debe a un proveedor; los saldos deudores van aparte y no se restan. */
export interface SaldoDelProveedor {
  proveedorId: string;
  proveedorNombre: string;
  porPagar: string;
  vencido: string;
  cargosConSaldo: number;
  saldosDeudores: string;
  notasConSaldoLibre: SaldoDeudor[];
}

/** Los filtros que acepta la lista; lo que falta no filtra. */
export interface ConsultaDeDocumentos {
  proveedorId?: string;
  estado?: EstadoBuscado;
  tipo?: TipoDeDocumento;
  emitidosDesde?: string;
  emitidosHasta?: string;
  soloVencidos?: boolean;
  pagina?: number;
  limite?: number;
}

export interface DocumentoACompletar {
  id: string;
  vencimiento?: string;
}

export interface DatosDeAnulacion {
  causa: CausaDeAnulacion;
  motivo: string;
}

/** Un proveedor de la cuenta, para el filtro de la lista. */
export interface ProveedorParaFiltro {
  id: string;
  nombre: string;
}
