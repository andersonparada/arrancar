import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DocumentoConRecepciones } from '../../../dominio/errores-de-recepcion.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

/** Lo que traen los avisos `libro-de-compras.documento_por_anular` y `…_por_eliminar`. */
export interface AvisoDeDocumento {
  documentoId: string;
}

export class RechazarDocumentoConRecepciones {
  constructor(private readonly dependencias: Pick<DependenciasDeRecepciones, 'unidadDeTrabajo' | 'recepciones'>) {}

  /**
   * Responde a los avisos del libro (que llegan a todos los módulos, dentro de la transacción del libro; con Inventarios
   * inactivo el mediador no lo llama, R-1): si el documento tiene recepciones, devoluciones o rebajas vigentes lanza su
   * error con los números y el libro no anula ni elimina nada. Sin movimientos vigentes, no hace nada.
   * @throws DocumentoConRecepciones con los números de los documentos de Inventarios.
   */
  ejecutar(operador: Operador, { documentoId }: AvisoDeDocumento): Promise<void> {
    const { unidadDeTrabajo, recepciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const numeros = await recepciones.documentosDeLaCompra(documentoId);
      if (numeros.length > 0) throw new DocumentoConRecepciones(numeros);
    });
  }
}
