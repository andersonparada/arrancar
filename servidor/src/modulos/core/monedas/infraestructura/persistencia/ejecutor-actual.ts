import type { BaseDatos, Ejecutor } from '../../../base-datos/conexion.js';
import {
  hayUnidadDeTrabajoEnCurso,
  transaccionEnCurso,
} from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';

/**
 * Con quién consultar el catálogo de monedas y los tipos de cambio: son datos de toda la instalación, sin seguridad por
 * empresa, así que se leen aunque no haya unidad de trabajo; si la hay, se usa su transacción (la misma foto que el
 * caso de uso).
 */
export function ejecutorActual(bd: BaseDatos): Ejecutor {
  return hayUnidadDeTrabajoEnCurso() ? transaccionEnCurso() : bd;
}
