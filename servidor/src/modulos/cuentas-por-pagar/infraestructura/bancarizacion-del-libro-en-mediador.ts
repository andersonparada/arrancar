import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { EvaluacionDeBancarizacion } from '../../core/contratos/libro-de-compras.contratos.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { BancarizacionDelLibro, PedidoDeEvaluacion } from '../aplicacion/puertos/puertos-de-efectivo.js';

/** La bancarización de un pago en efectivo la evalúa el libro: orden `libro-de-compras.evaluar_bancarizacion`. */
export class BancarizacionDelLibroEnMediador implements BancarizacionDelLibro {
  evaluar(operador: Operador, pedido: PedidoDeEvaluacion): Promise<EvaluacionDeBancarizacion> {
    return mediador.enviar(operador, 'libro-de-compras.evaluar_bancarizacion', pedido);
  }
}
