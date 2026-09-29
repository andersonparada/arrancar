import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AvisosDeProveedor, ProveedorGuardado } from '../aplicacion/puertos/avisos-de-proveedor.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDeProveedorEnMediador implements AvisosDeProveedor {
  proveedorGuardado(operador: Operador, aviso: ProveedorGuardado): Promise<void> {
    return mediador.avisar(operador, 'terceros.proveedor_guardado', aviso);
  }
}
