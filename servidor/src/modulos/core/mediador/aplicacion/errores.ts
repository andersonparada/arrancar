import { ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

/** No hay módulo que atienda la orden, o el que la atiende no está activo en la cuenta del operador. */
export class ModuloNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'modulo_no_disponible';
}

/**
 * Error de programación: dos módulos intentaron registrarse para la misma orden.
 * Una orden la atiende exactamente un módulo; se detecta al registrar, no al enviarla.
 */
export class ManejadorDuplicadoParaLaOrden extends Error {
  constructor(orden: string) {
    super(`Ya hay un manejador para la orden "${orden}": una orden la atiende un solo módulo.`);
  }
}

/** Error de programación: un módulo registró dos respuestas para la misma pregunta. */
export class ManejadorDuplicadoParaLaPregunta extends Error {
  constructor(pregunta: string, modulo: string) {
    super(`El módulo "${modulo}" ya responde la pregunta "${pregunta}".`);
  }
}
