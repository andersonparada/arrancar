import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { LibroDeCompras, OrdenDeAnulacion } from '../aplicacion/puertos/puertos-de-libro-de-compras.js';

const ORIGEN = 'cuentas-por-pagar';

/** Las órdenes a Libro de compras van por el mediador: este módulo no importa nada del otro. */
export class LibroDeComprasEnMediador implements LibroDeCompras {
  marcarProcesado(operador: Operador, documentoId: string, procesado: boolean): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId, procesado });
  }

  anular(operador: Operador, orden: OrdenDeAnulacion): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.anular_documento', { ...orden, origen: ORIGEN });
  }

  eliminar(operador: Operador, documentoId: string): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.eliminar_documento', { documentoId, origen: ORIGEN });
  }
}
