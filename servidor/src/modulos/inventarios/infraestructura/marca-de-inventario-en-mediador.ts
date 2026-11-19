import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  CambioDeMarcaEnElLibro,
  MarcaDeInventarioEnElLibro,
} from '../aplicacion/puertos/marca-de-inventario-en-el-libro.js';

/** La orden va por el mediador: este módulo no importa nada del Libro de compras fuera de sus tablas. */
export class MarcaDeInventarioEnMediador implements MarcaDeInventarioEnElLibro {
  cambiar(operador: Operador, cambio: CambioDeMarcaEnElLibro): Promise<void> {
    return mediador.enviar(operador, 'libro-de-compras.cambiar_marca_de_inventario', cambio);
  }
}
