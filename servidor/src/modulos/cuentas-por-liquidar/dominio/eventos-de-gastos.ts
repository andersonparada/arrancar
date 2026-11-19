import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { ClaseDeGasto, Gasto, TratamientoSinDocumento } from './gastos.js';

/** El evento de un gasto que acaba de quedar asignado a un anticipo. */
export function eventoDeGastoAsignado(empresaId: string, gasto: Gasto): GastoAsignado {
  return new GastoAsignado({
    empresaId,
    gastoId: gasto.id,
    anticipoId: gasto.anticipoId!,
    clase: gasto.clase,
    documentoDeCompraId: gasto.documentoDeCompraId,
    fecha: gasto.fecha,
    montoCentavos: gasto.montoCentavos,
    montoRetenidoCentavos: gasto.montoRetenidoCentavos,
    resta: gasto.resta,
    conActivoFijo: gasto.conActivoFijo,
    conceptoDeGastoId: gasto.conceptoDeGastoId,
    tratamientoSinDocumento: gasto.tratamientoSinDocumento,
  });
}

/** El evento de un gasto (tal como estaba en el anticipo) que acaba de salir de él. */
export function eventoDeGastoQuitado(empresaId: string, gasto: Gasto, volvioALaBandeja: boolean): GastoQuitado {
  return new GastoQuitado({
    empresaId,
    gastoId: gasto.id,
    anticipoId: gasto.anticipoId!,
    clase: gasto.clase,
    fecha: gasto.fecha,
    montoCentavos: gasto.montoCentavos,
    montoRetenidoCentavos: gasto.montoRetenidoCentavos,
    resta: gasto.resta,
    volvioALaBandeja,
  });
}

export interface DatosDeGastoAsignado {
  empresaId: string;
  gastoId: string;
  anticipoId: string;
  clase: ClaseDeGasto;
  documentoDeCompraId: string | null;
  fecha: string;
  /** Lo que salió del anticipo (el neto). */
  montoCentavos: number;
  montoRetenidoCentavos: number;
  /** Nota de crédito: baja lo gastado. */
  resta: boolean;
  conActivoFijo: boolean;
  conceptoDeGastoId: string | null;
  tratamientoSinDocumento: TratamientoSinDocumento | null;
}

/** Se asignó un documento o se registró un gasto sin documento en un anticipo. Se publica tras confirmar. */
export class GastoAsignado extends EventoDominio<DatosDeGastoAsignado> {
  readonly nombre = 'cuentas-por-liquidar.gasto_asignado';

  constructor(datos: DatosDeGastoAsignado) {
    super(datos);
  }
}

export interface DatosDeGastoQuitado {
  empresaId: string;
  gastoId: string;
  anticipoId: string;
  clase: ClaseDeGasto;
  fecha: string;
  montoCentavos: number;
  montoRetenidoCentavos: number;
  resta: boolean;
  /** El documento volvió a la bandeja (`true`) o el gasto sin documento quedó anulado (`false`). */
  volvioALaBandeja: boolean;
}

/** Se quitó un gasto de un anticipo abierto (por la ventana o porque el libro anuló el documento). */
export class GastoQuitado extends EventoDominio<DatosDeGastoQuitado> {
  readonly nombre = 'cuentas-por-liquidar.gasto_quitado';

  constructor(datos: DatosDeGastoQuitado) {
    super(datos);
  }
}
