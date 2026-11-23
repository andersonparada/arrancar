/** Una línea de la bandeja «Por recibir»: del libro de compras, con lo recibido y lo que falta. */
export interface LineaPorRecibirDto {
  lineaId: string;
  documentoId: string;
  numeroDeLinea: number;
  /** `factura`, `nota_de_credito`…; las notas se aplican con una devolución o una rebaja. */
  tipoDeDocumento: string;
  /** La factura que corrige una nota (del libro). */
  documentoAfectadoId: string | null;
  documento: string;
  fechaEmision: string;
  proveedorNombre: string;
  conceptoId: string;
  conceptoNombre: string;
  descripcion: string | null;
  /** Dinero como texto. */
  costo: string;
  /** Lo recibido (factura) o lo que la nota ya rebajó o devolvió (nota de crédito). */
  recibido: string;
  pendiente: string;
  articuloSugeridoId: string | null;
  articuloSugeridoCodigo: string | null;
  articuloSugeridoNombre: string | null;
  /** La línea está marcada como inventario en el libro; una nota de crédito puede no estarlo (descartarla no toca el libro). */
  esInventario: boolean;
  /** El documento es anterior a la fecha de inicio de la empresa: si ya estaba en el saldo inicial, se descarta. */
  anteriorALaFechaDeInicio: boolean;
}

export interface PorRecibirDto {
  lineas: LineaPorRecibirDto[];
}

export interface FiltrosDePorRecibir {
  /** Primer día del período (`AAAA-MM-01`) del documento, desde. */
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  conceptoId?: string;
}

export interface DescarteDto {
  lineaId: string;
  avisos: string[];
}

/** Un renglón de la recepción: la línea del libro, lo que entra y su costo (el monto de la línea que le toca). */
export interface RenglonDeRecepcionSolicitado {
  lineaId: string;
  articuloId: string;
  loteId: string | null;
  /** Para crear el lote al recibir; excluyente con `loteId`. */
  loteNuevo: { codigo: string; fechaDeVencimiento: string | null; fechaDeFabricacion: string | null } | null;
  cantidad: string;
  unidadId: string | null;
  /** Dinero como texto: la parte del costo de la línea que se recibe. */
  monto: string;
}

export interface SolicitudDeRecepcion {
  fecha: string;
  bodegaId: string;
  observaciones: string | null;
  renglones: RenglonDeRecepcionSolicitado[];
}

export interface SolicitudDeDevolucion {
  fecha: string;
  /** La línea de la nota de crédito que respalda la devolución. */
  lineaId: string;
  observaciones: string | null;
  renglones: Array<{ movimientoDeEntradaId: string; cantidad: string; unidadId: string | null }>;
}

export interface SolicitudDeRebaja {
  fecha: string;
  /** La línea de la nota de crédito que rebaja el costo. */
  lineaId: string;
  /** Dinero como texto, positivo. */
  monto: string;
  base: 'valor' | 'cantidad';
  observaciones: string | null;
}
