import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

/** El comprobante no tiene un documento anulado por su emisor. */
export class ComprobanteSinDocumentoAnulado extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobante_sin_documento_anulado';

  constructor() {
    super('El comprobante no tiene un documento anulado por su emisor.');
  }
}

/** La situación actual del documento anulado no admite la acción pedida. */
export class SituacionDelDocumentoNoPermite extends ReglaDeNegocioInfringida {
  override readonly codigo = 'situacion_del_documento_no_permite';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** La devolución o el cobro piden monto y destino, y el monto no pasa de lo gastado. */
export class SalidaDelDocumentoInvalida extends DatoInvalido {
  override readonly codigo = 'salida_del_documento_invalida';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** El monto de la devolución o del cobro pasa de lo que costó el comprobante. */
export class MontoDeLaSalidaExcedido extends DatoInvalido {
  override readonly codigo = 'monto_de_la_salida_excedido';

  constructor(maximoCentavos: number) {
    super(`El monto no puede pasar de lo gastado: ${montoLegible(deCentavos(maximoCentavos))}.`);
  }
}

/** El documento que reemplaza a la factura anulada no sirve para eso. */
export class ReemplazoNoValido extends ReglaDeNegocioInfringida {
  override readonly codigo = 'reemplazo_no_valido';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** Un fondo con documentos anulados por su emisor sin resolver no se cierra sin el permiso de excepción. */
export class FondoConDocumentosPorResolver extends ReglaDeNegocioInfringida {
  override readonly codigo = 'fondo_con_documentos_por_resolver';

  constructor(cantidad: number) {
    super(
      `El fondo tiene ${cantidad} documento(s) anulado(s) por su emisor sin resolver: resuélvalos antes de cerrarlo, o cierre con el permiso de excepción y un motivo.`,
    );
  }
}
