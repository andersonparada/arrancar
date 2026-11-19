import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { MarcadorDeDocumentos } from '../aplicacion/puertos/puertos-de-anticipos.js';

/** La orden a Libro de compras va por el mediador: este módulo no importa nada del otro. */
export class MarcadorDeDocumentosEnMediador implements MarcadorDeDocumentos {
  marcarProcesado(operador: Operador, documentoId: string, procesado: boolean): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId, procesado });
  }
}
