import { RecursoDuplicado } from '../../core/compartido/aplicacion/errores.js';

/**
 * El documento ya está registrado en la empresa activa. Trae su id en `detalles.documentoId` para que la pantalla
 * ofrezca abrirlo; si el repetido está en otra empresa o cuenta, la base rechaza con un mensaje que no dice dónde.
 */
export class DocumentoRepetido extends RecursoDuplicado {
  override readonly codigo = 'documento_repetido';

  constructor(documentoId: string) {
    super('Ese documento ya está registrado en esta empresa.', { documentoId });
  }
}
