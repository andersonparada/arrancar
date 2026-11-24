import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { AbridorDeDocumentosDeBaja, DocumentoDeBajaAbierto } from './abrir-documento-de-baja.js';

/** Abre la denuncia de una baja por robo o extravío. */
export class AbrirDenunciaDeBaja {
  constructor(private readonly abridor: AbridorDeDocumentosDeBaja) {}

  /** @throws RecursoNoEncontrado si la baja no existe; DocumentoDeBajaInexistente si todavía no tiene denuncia. */
  ejecutar(operador: Operador, bajaId: string): Promise<DocumentoDeBajaAbierto> {
    return this.abridor.abrir(operador, { bajaId, documento: 'denuncia' });
  }
}
