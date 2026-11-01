import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';

/**
 * Separación de funciones: quien ingresó el documento en Libro de compras o lo completó necesita el permiso
 * `autorizar-propios` para autorizarlo. Es 403 porque lo que falta es un permiso; el mensaje nombra el documento.
 */
export class AutorizacionDeLoPropio extends AccesoDenegado {
  override readonly codigo = 'autorizacion_de_lo_propio';

  constructor(etiqueta: string) {
    super(
      `No puede autorizar el documento ${etiqueta} porque usted lo ingresó o lo completó: debe autorizarlo otra persona.`,
    );
  }
}
