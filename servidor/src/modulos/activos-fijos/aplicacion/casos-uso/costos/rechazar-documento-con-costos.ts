import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DocumentoConCostosCapitalizados } from '../../../dominio/errores-de-costo.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';

/** Lo que traen los avisos `libro-de-compras.documento_por_anular` y `…_por_eliminar`. */
export interface AvisoDeDocumento {
  documentoId: string;
}

export class RechazarDocumentoConCostos {
  constructor(private readonly dependencias: Pick<DependenciasDeCostos, 'unidadDeTrabajo' | 'costos'>) {}

  /**
   * Responde a los avisos del libro (que llegan a todos los módulos, no solo al destino del documento, dentro de la
   * transacción del libro): si el documento tiene costos vigentes en algún activo lanza su error y el libro no anula
   * ni elimina nada (R-1). Sin costos vigentes, no hace nada.
   * @throws DocumentoConCostosCapitalizados con los códigos de los activos.
   */
  ejecutar(operador: Operador, { documentoId }: AvisoDeDocumento): Promise<void> {
    const { unidadDeTrabajo, costos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const codigos = await costos.codigosDeActivosConCostosDelDocumento(documentoId);
      if (codigos.length > 0) throw new DocumentoConCostosCapitalizados(codigos);
    });
  }
}
