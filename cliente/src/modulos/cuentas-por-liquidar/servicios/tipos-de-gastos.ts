export type ClaseDeGasto = 'documento' | 'sin_documento';
export type EstadoDeGasto = 'vigente' | 'anulado';
export type TratamientoSinDocumento = 'no_deducible' | 'renta_del_trabajo';

/** Un gasto de un anticipo o un documento de la bandeja (dinero como texto con dos decimales). */
export interface Gasto {
  id: string;
  /** Nulo en la bandeja. */
  anticipoId: string | null;
  clase: ClaseDeGasto;
  documentoDeCompraId: string | null;
  tipoDeDocumento: string | null;
  /** `A-123` en un documento; la descripción en un gasto sin documento. */
  etiqueta: string;
  proveedorId: string | null;
  proveedor: string | null;
  fechaDeEmision: string | null;
  fecha: string;
  /** Lo que salió del anticipo (el neto). */
  monto: string;
  montoRetenido: string;
  conRetencion: boolean;
  motivoConRetencion: string | null;
  resta: boolean;
  conActivoFijo: boolean;
  descripcion: string | null;
  pagadoA: string | null;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string | null;
  tratamientoSinDocumento: TratamientoSinDocumento | null;
  sinBancarizar: boolean;
  asignadoEn: string | null;
  estado: EstadoDeGasto;
  avisos: string[];
}

/** Una fila de la bandeja: si quien mira puede asignar con la excepción de retención. */
export interface GastoDeBandeja extends Gasto {
  puedeAsignarConRetencion: boolean;
}

export interface AsignacionDeGastos {
  gastos: Gasto[];
  avisos: string[];
}

export interface FiltroDeBandeja {
  proveedorId?: string | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  conRetencion?: boolean | undefined;
}

export interface DocumentoPorAsignar {
  gastoId: string;
  fecha?: string;
  motivoConRetencion?: string | null;
}

export interface SolicitudDeGastoSinDocumento {
  fecha?: string;
  monto: string;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  tratamiento?: TratamientoSinDocumento;
}
