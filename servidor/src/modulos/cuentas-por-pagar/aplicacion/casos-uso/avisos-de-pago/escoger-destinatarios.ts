import type { DestinatarioPosible, OrigenDelDestinatario } from '../../../dominio/aviso-de-pago.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { DireccionDelAvisoNoUtilizable } from '../../errores-de-avisos.js';

/**
 * Quién recibe el aviso: siempre uno de los destinatarios posibles del proveedor (ya registrados), nunca una dirección
 * escrita en la petición.
 * @throws RecursoNoEncontrado si el pedido no es del proveedor del pago (o no existe: no se distingue).
 * @throws DireccionDelAvisoNoUtilizable si su correo no pasa la regla de envío.
 */
export function escogerDestinatarios(
  posibles: readonly DestinatarioPosible[],
  pedidos: ReadonlyArray<{ origen: OrigenDelDestinatario; origenId: string }>,
): DestinatarioPosible[] {
  return pedidos.map((pedido) => {
    const encontrado = posibles.find((p) => p.origen === pedido.origen && p.origenId === pedido.origenId);
    if (!encontrado) throw new RecursoNoEncontrado('El destinatario');
    if (!encontrado.utilizable) throw new DireccionDelAvisoNoUtilizable(encontrado.nombre);
    return encontrado;
  });
}
