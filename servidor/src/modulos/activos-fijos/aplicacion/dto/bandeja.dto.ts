/** Filtros de la bandeja «Por capitalizar»; todos son opcionales. */
export interface FiltrosDeBandeja {
  /** Primer día de un período (`aaaa-mm-dd`) o más. */
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  conceptoId?: string;
  /** Con o sin clase o activo propuesto. */
  conPropuesta?: boolean;
}

/** Una línea del libro con costo por capitalizar. Los montos van en texto con dos decimales; la nota de crédito, negativa. */
export interface LineaDeBandejaDto {
  lineaId: string;
  documentoId: string;
  numeroDeLinea: number;
  tipoDeDocumento: string;
  documento: string;
  fechaEmision: string;
  proveedorNombre: string;
  conceptoId: string;
  conceptoNombre: string;
  descripcion: string | null;
  tipoDeLinea: 'bien' | 'servicio';
  costo: string;
  capitalizado: string;
  pendiente: string;
  claseSugeridaId: string | null;
  claseSugeridaNombre: string | null;
  /** El costo no llega al umbral de la empresa: se propone descartar o registrar como bien de control (D5). */
  bajoElUmbral: boolean;
  /** El documento es anterior a la fecha de inicio: si el bien ya estaba en el balance de apertura, va como saldo inicial. */
  anteriorALaFechaDeInicio: boolean;
  /** En una nota de crédito: el activo que más costo capitalizado tiene de su factura. */
  activoSugeridoId: string | null;
  activoSugeridoCodigo: string | null;
}

export interface BandejaDto {
  /** El umbral de la empresa en quetzales, o `null` si no tiene. */
  umbral: string | null;
  lineas: LineaDeBandejaDto[];
}

/** El aviso que acompaña a un descarte (R-3): la marca del libro no se corrige. */
export interface DescarteDto {
  lineaId: string;
  avisos: string[];
}
