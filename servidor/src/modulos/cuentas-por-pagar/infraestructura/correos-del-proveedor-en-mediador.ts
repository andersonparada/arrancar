import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/terceros.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { CorreosDelProveedorDeTerceros } from '../aplicacion/puertos/puertos-de-avisos-de-pago.js';
import type { CorreosDelProveedor } from '../dominio/aviso-de-pago.js';

/** Los correos registrados del proveedor los da Terceros (orden `terceros.obtener_correos_de_proveedor`). */
export class CorreosDelProveedorEnMediador implements CorreosDelProveedorDeTerceros {
  obtener(operador: Operador, proveedorId: string): Promise<CorreosDelProveedor> {
    return mediador.enviar(operador, 'terceros.obtener_correos_de_proveedor', { proveedorId });
  }
}
