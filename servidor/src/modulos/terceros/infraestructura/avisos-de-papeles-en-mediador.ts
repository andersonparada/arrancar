import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AvisosDePapeles, ClienteGuardado, ProveedorGuardado } from '../aplicacion/puertos/avisos-de-papeles.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDePapelesEnMediador implements AvisosDePapeles {
  proveedorGuardado(operador: Operador, aviso: ProveedorGuardado): Promise<void> {
    return mediador.avisar(operador, 'terceros.proveedor_guardado', aviso);
  }

  clienteGuardado(operador: Operador, aviso: ClienteGuardado): Promise<void> {
    return mediador.avisar(operador, 'terceros.cliente_guardado', aviso);
  }
}
