import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { EventosDominio } from '../../core/eventos/bus-eventos.js';
import '../../core/contratos/activos-fijos.contratos.js';

export type DatosDeActivoCapitalizado = EventosDominio['activos-fijos.activo_capitalizado'];
export type DatosDeCostoAnulado = EventosDominio['activos-fijos.costo_anulado'];

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
