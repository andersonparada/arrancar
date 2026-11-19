import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/**
 * Qué módulos están activos en la cuenta (CCL-B1). Bancos lo usa para dos cosas: no cambiar un movimiento cuyo módulo
 * de origen está apagado (nadie revisaría sus reglas) y dejar elegir a mano los conceptos que ese módulo reserva
 * solo si no está activo.
 */
export interface ModulosDeOrigen {
  estaActivo(operador: Operador, modulo: string): Promise<boolean>;
  /** Las claves de todos los módulos activos de la cuenta. */
  activos(operador: Operador): Promise<ReadonlySet<string>>;
}
