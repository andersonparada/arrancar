export type ClaseDeGasto = 'documento' | 'sin_documento';

export type EstadoDeGasto = 'vigente' | 'anulado';

/** Cómo se trata un gasto sin documento (V-6, por validar con el contador): `renta_del_trabajo` solo en un empleado. */
export type TratamientoSinDocumento = 'no_deducible' | 'renta_del_trabajo';

/** El recurso con que se auditan los gastos. */
export const RECURSO_DE_GASTOS = 'cuentas-por-liquidar.gastos';

/**
 * Lo que se gastó con un anticipo: un documento del libro de compras o un gasto sin documento. Sin `anticipoId` el
 * documento está en la bandeja, esperando que lo asignen. `montoCentavos` es lo que salió del anticipo (el neto, sin la
 * retención que entera la empresa); las notas de crédito (`resta`) bajan lo gastado.
 */
export interface Gasto {
  id: string;
  anticipoId: string | null;
  clase: ClaseDeGasto;
  documentoDeCompraId: string | null;
  resta: boolean;
  proveedorId: string | null;
  /** `AAAA-MM-DD`: la del documento (en la bandeja) o la que se escribió al asignar. */
  fecha: string;
  montoCentavos: number;
  montoRetenidoCentavos: number;
  conRetencion: boolean;
  motivoConRetencion: string | null;
  conActivoFijo: boolean;
  descripcion: string | null;
  pagadoA: string | null;
  conceptoDeGastoId: string | null;
  motivoSinDocumento: string | null;
  tratamientoSinDocumento: TratamientoSinDocumento | null;
  sinBancarizar: boolean;
  /** Quién autorizó la excepción de retención, si la hubo: es quien asignó. */
  asignadoPor: string | null;
  asignadoEn: string | null;
  estado: EstadoDeGasto;
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que salió del anticipo por un documento: el total menos lo que retiene la empresa. */
export const montoDeLoPagado = (totalCentavos: number, retencionesCentavos: number): number =>
  totalCentavos - retencionesCentavos;

/** Lo que se le pagó en realidad al proveedor: lo que salió del anticipo más lo retenido (cuenta para la bancarización). */
export const totalPagadoDelGasto = (gasto: Pick<Gasto, 'montoCentavos' | 'montoRetenidoCentavos'>): number =>
  gasto.montoCentavos + gasto.montoRetenidoCentavos;

/** Un gasto de documento está en la bandeja mientras no tenga anticipo y siga vigente. */
export const estaEnLaBandeja = (gasto: Pick<Gasto, 'anticipoId' | 'estado'>): boolean =>
  gasto.anticipoId === null && gasto.estado === 'vigente';
