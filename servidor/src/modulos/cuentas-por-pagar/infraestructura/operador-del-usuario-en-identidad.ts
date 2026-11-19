import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { operadorDeUsuario } from '../../core/identidad/contexto.js';
import type { OperadorDelUsuario } from '../aplicacion/puertos/puertos-de-avisos-de-pago.js';

/** El operador de quien registró o anuló un pago, con el alcance que le daría su sesión (lo resuelve core/identidad). */
export class OperadorDelUsuarioEnIdentidad implements OperadorDelUsuario {
  de(usuarioId: string, empresaId: string): Promise<Operador | null> {
    return operadorDeUsuario.ejecutar(usuarioId, empresaId);
  }
}
