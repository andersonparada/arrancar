import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';

/**
 * Una factura con retención solo entra a un anticipo con el permiso de excepción (§7.2). Es 403 porque lo que falta es un
 * permiso; la factura sigue en la bandeja.
 */
export class RetencionSinPermiso extends AccesoDenegado {
  override readonly codigo = 'retencion_sin_permiso';

  constructor(etiqueta: string, retenidoTexto: string) {
    super(
      `La factura ${etiqueta} lleva retención de ${retenidoTexto}: para pagarla del anticipo hace falta el permiso de excepción. Queda en la bandeja.`,
    );
  }
}
