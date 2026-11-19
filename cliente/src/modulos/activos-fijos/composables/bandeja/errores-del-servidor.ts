import type { EdicionDeAsignacion } from './edicion-de-capitalizacion';
import { llaveDeError } from './validar-capitalizacion';

const ASIGNACION = /^asignaciones\.(\d+)\.(?:activoNuevo\.)?(.+)$/;

/**
 * Los errores de validación del servidor (`asignaciones.<i>.activoNuevo.<campo>`) pasan a la llave de la parte
 * (`<clave>.<campo>`) para que se vean en su campo. Lo que no se reconoce se deja como llegó.
 */
export function erroresDeAsignaciones(
  errores: Record<string, string>,
  partes: readonly EdicionDeAsignacion[],
): Record<string, string> {
  const traducidos: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const [, posicion, resto] = ASIGNACION.exec(campo) ?? [];
    const parte = posicion === undefined ? undefined : partes[Number(posicion)];
    traducidos[parte && resto ? llaveDeError(parte.clave, resto) : campo] = mensaje;
  }
  return traducidos;
}
