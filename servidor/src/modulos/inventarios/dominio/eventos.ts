import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { EventosDominio } from '../../core/eventos/bus-eventos.js';
import '../../core/contratos/inventarios.contratos.js';

export type DatosDeEntradaRegistrada = EventosDominio['inventarios.entrada_registrada'];
export type DatosDeSalidaRegistrada = EventosDominio['inventarios.salida_registrada'];
export type DatosDeDevolucionAProveedor = EventosDominio['inventarios.devolucion_a_proveedor'];
export type DatosDeCostoAjustado = EventosDominio['inventarios.costo_ajustado'];
export type DatosDeTrasladoRegistrado = EventosDominio['inventarios.traslado_registrado'];
export type DatosDeDocumentoAnulado = EventosDominio['inventarios.documento_anulado'];
export type DatosDeCostoRecalculado = EventosDominio['inventarios.costo_recalculado'];

/** Entró mercadería por una recepción o una entrada manual. Se publica tras confirmar. */
export class EntradaRegistrada extends EventoDominio<DatosDeEntradaRegistrada> {
  readonly nombre = 'inventarios.entrada_registrada';

  constructor(datos: DatosDeEntradaRegistrada) {
    super(datos);
  }
}

/** Salió mercadería por consumo. Se publica tras confirmar. */
export class SalidaRegistrada extends EventoDominio<DatosDeSalidaRegistrada> {
  readonly nombre = 'inventarios.salida_registrada';

  constructor(datos: DatosDeSalidaRegistrada) {
    super(datos);
  }
}

/** Se devolvió mercadería a un proveedor. Se publica tras confirmar. */
export class DevolucionAProveedorRegistrada extends EventoDominio<DatosDeDevolucionAProveedor> {
  readonly nombre = 'inventarios.devolucion_a_proveedor';

  constructor(datos: DatosDeDevolucionAProveedor) {
    super(datos);
  }
}

/** Una nota de crédito rebajó el costo de entradas recibidas. Se publica tras confirmar. */
export class CostoAjustado extends EventoDominio<DatosDeCostoAjustado> {
  readonly nombre = 'inventarios.costo_ajustado';

  constructor(datos: DatosDeCostoAjustado) {
    super(datos);
  }
}

/** Una mitad de un traslado entre bodegas (la salida o su recepción); informativo y sin dinero. Se publica tras confirmar. */
export class TrasladoRegistrado extends EventoDominio<DatosDeTrasladoRegistrado> {
  readonly nombre = 'inventarios.traslado_registrado';

  constructor(datos: DatosDeTrasladoRegistrado) {
    super(datos);
  }
}

/** Se anuló un documento del kardex. Se publica tras confirmar. */
export class DocumentoDeInventarioAnulado extends EventoDominio<DatosDeDocumentoAnulado> {
  readonly nombre = 'inventarios.documento_anulado';

  constructor(datos: DatosDeDocumentoAnulado) {
    super(datos);
  }
}

/** El costo de salidas ya registradas cambió. Se publica tras confirmar. */
export class CostoRecalculado extends EventoDominio<DatosDeCostoRecalculado> {
  readonly nombre = 'inventarios.costo_recalculado';

  constructor(datos: DatosDeCostoRecalculado) {
    super(datos);
  }
}
