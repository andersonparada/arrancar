import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { AbridorDeDocumentosDeBaja, DocumentoDeBajaAbierto } from './abrir-documento-de-baja.js';

/** Abre el acta de una baja o venta, para verla o imprimirla. */
export class AbrirActaDeBaja {
  constructor(private readonly abridor: AbridorDeDocumentosDeBaja) {}

  /** @throws RecursoNoEncontrado si la baja no existe; DocumentoDeBajaInexistente si todavía no tiene acta. */
  ejecutar(operador: Operador, bajaId: string): Promise<DocumentoDeBajaAbierto> {
    return this.abridor.abrir(operador, { bajaId, documento: 'acta' });
  }
}
