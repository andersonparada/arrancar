import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';

/** La baja todavía no tiene el acta o la denuncia que se pidió abrir. */
export class DocumentoDeBajaInexistente extends RecursoNoEncontrado {
  override readonly codigo = 'documento_de_baja_inexistente';

  constructor(documento: 'acta' | 'denuncia') {
    super(documento === 'acta' ? 'El acta de la baja' : 'La denuncia de la baja');
  }
}
