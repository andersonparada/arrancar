import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { BancarizacionDelLibro } from '../aplicacion/puertos/puertos-de-gastos.js';

/** La bancarización de lo gastado la evalúa el libro: orden `libro-de-compras.evaluar_bancarizacion`. */
export class BancarizacionDelLibroEnMediador implements BancarizacionDelLibro {
  evaluar(operador: Operador, pedido: Parameters<BancarizacionDelLibro['evaluar']>[1]) {
    return mediador.enviar(operador, 'libro-de-compras.evaluar_bancarizacion', pedido);
  }
}
