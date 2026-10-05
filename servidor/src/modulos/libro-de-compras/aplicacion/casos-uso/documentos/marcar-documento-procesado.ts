import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DocumentoYaAnulado } from '../../../dominio/errores-de-baja.js';
import type { RepositorioDeDocumentosGuardados } from '../../puertos/puertos-de-baja-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosGuardados;
}

/**
 * Atiende la orden `libro-de-compras.marcar_procesado`: el destino dice que ya procesó el documento (queda con
 * la fecha de ahora, y ya no se elimina) o que lo devolvió a pendiente. Corre en la transacción del destino.
 * No es una baja ni un cambio de dinero o fechas, así que no se audita.
 */
export class MarcarDocumentoProcesado {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws DocumentoYaAnulado si se quiere marcar como procesado uno anulado; devolver uno anulado a pendiente no hace nada.
   */
  ejecutar(operador: Operador, pedido: { documentoId: string; procesado: boolean }): Promise<void> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const guardado = await repositorio.buscar(pedido.documentoId, true);
      if (!guardado) throw new RecursoNoEncontrado('El documento');
      if (guardado.estado === 'anulado') {
        if (pedido.procesado) throw new DocumentoYaAnulado();
        return;
      }
      await repositorio.marcarProcesado(pedido.documentoId, pedido.procesado);
    });
  }
}
