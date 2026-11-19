import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { EventosDominio } from '../../core/eventos/bus-eventos.js';
import '../../core/contratos/activos-fijos.contratos.js';

export type DatosDeActivoCapitalizado = EventosDominio['activos-fijos.activo_capitalizado'];
export type DatosDeCostoAnulado = EventosDominio['activos-fijos.costo_anulado'];
export type DatosDeMejoraCapitalizada = EventosDominio['activos-fijos.mejora_capitalizada'];
export type DatosDeBaseFiscalCambiada = EventosDominio['activos-fijos.base_fiscal_cambiada'];
export type DatosDeActivoTrasladado = EventosDominio['activos-fijos.activo_trasladado'];
export type DatosDeTrasladoAnulado = EventosDominio['activos-fijos.traslado_anulado'];
export type DatosDeDepreciacionCerrada = EventosDominio['activos-fijos.depreciacion_cerrada'];
export type DatosDeDepreciacionReabierta = EventosDominio['activos-fijos.depreciacion_reabierta'];

/** Se guardaron costos de un activo (lo escuchará Contabilidad, cuando exista). Se publica tras confirmar. */
export class ActivoCapitalizado extends EventoDominio<DatosDeActivoCapitalizado> {
  readonly nombre = 'activos-fijos.activo_capitalizado';

  constructor(datos: DatosDeActivoCapitalizado) {
    super(datos);
  }
}

/** Se anuló un costo de un activo. Se publica tras confirmar. */
export class CostoAnulado extends EventoDominio<DatosDeCostoAnulado> {
  readonly nombre = 'activos-fijos.costo_anulado';

  constructor(datos: DatosDeCostoAnulado) {
    super(datos);
  }
}

/** Se cerró un mes de depreciación (lo escuchará Contabilidad, cuando exista). Se publica tras confirmar. */
export class DepreciacionCerrada extends EventoDominio<DatosDeDepreciacionCerrada> {
  readonly nombre = 'activos-fijos.depreciacion_cerrada';

  constructor(datos: DatosDeDepreciacionCerrada) {
    super(datos);
  }
}

/** Se reabrió un mes de depreciación: Contabilidad revierte lo del mes. Se publica tras confirmar. */
export class DepreciacionReabierta extends EventoDominio<DatosDeDepreciacionReabierta> {
  readonly nombre = 'activos-fijos.depreciacion_reabierta';

  constructor(datos: DatosDeDepreciacionReabierta) {
    super(datos);
  }
}

/** Se registró una mejora o un costo posterior de un activo en uso. Se publica tras confirmar. */
export class MejoraCapitalizada extends EventoDominio<DatosDeMejoraCapitalizada> {
  readonly nombre = 'activos-fijos.mejora_capitalizada';

  constructor(datos: DatosDeMejoraCapitalizada) {
    super(datos);
  }
}

/** Cambió la matrícula o el catastro de un edificio. Se publica tras confirmar. */
export class BaseFiscalCambiada extends EventoDominio<DatosDeBaseFiscalCambiada> {
  readonly nombre = 'activos-fijos.base_fiscal_cambiada';

  constructor(datos: DatosDeBaseFiscalCambiada) {
    super(datos);
  }
}

/** Un activo cambió de ubicación con una boleta de traslado. Se publica tras confirmar. */
export class ActivoTrasladado extends EventoDominio<DatosDeActivoTrasladado> {
  readonly nombre = 'activos-fijos.activo_trasladado';

  constructor(datos: DatosDeActivoTrasladado) {
    super(datos);
  }
}

/** Se anuló una boleta de traslado y el activo volvió a su ubicación anterior. Se publica tras confirmar. */
export class TrasladoAnulado extends EventoDominio<DatosDeTrasladoAnulado> {
  readonly nombre = 'activos-fijos.traslado_anulado';

  constructor(datos: DatosDeTrasladoAnulado) {
    super(datos);
  }
}
