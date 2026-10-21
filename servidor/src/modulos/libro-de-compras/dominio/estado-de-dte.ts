import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Dónde va una fila de la bandeja de DTE recibidos. */
export const ESTADOS_DE_DTE = ['pendiente', 'registrado', 'descartado', 'bloqueado'] as const;
export type EstadoDeDte = (typeof ESTADOS_DE_DTE)[number];

/** Por qué una fila queda bloqueada (hoy solo uno; el recibo FEL a la empresa ya no bloquea). */
export const MOTIVOS_DE_BLOQUEO = ['registrado_en_otra_empresa'] as const;
export type MotivoDeBloqueo = (typeof MOTIVOS_DE_BLOQUEO)[number];

/** El estado del DTE en la SAT, tal como llegó en el archivo. */
export type EstadoDeDteEnLaSat = 'vigente' | 'anulado';

/**
 * Los cambios de estado permitidos:
 * - `pendiente` se registra, se descarta o se bloquea (ya está en otra empresa de la cuenta).
 * - `registrado` solo vuelve a `pendiente` (se anuló o eliminó su documento).
 * - `descartado` se restaura a `pendiente` o se registra (el usuario decidió registrarlo).
 * - `bloqueado` se libera a `pendiente` (la otra empresa soltó el DTE), se descarta (la lleva la otra empresa) o se registra.
 */
const TRANSICIONES: Record<EstadoDeDte, readonly EstadoDeDte[]> = {
  pendiente: ['registrado', 'descartado', 'bloqueado'],
  registrado: ['pendiente'],
  descartado: ['pendiente', 'registrado'],
  bloqueado: ['pendiente', 'registrado', 'descartado'],
};

/** El DTE no puede pasar de un estado de la bandeja al otro. */
export class TransicionDeDteInvalida extends ReglaDeNegocioInfringida {
  readonly codigo = 'transicion_de_dte_invalida';

  constructor(desde: EstadoDeDte, hacia: EstadoDeDte) {
    super(`Un DTE ${desde} no puede pasar a ${hacia}.`);
  }
}

export function transicionValida(desde: EstadoDeDte, hacia: EstadoDeDte): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** @throws TransicionDeDteInvalida si el cambio no está permitido. */
export function exigirTransicion(desde: EstadoDeDte, hacia: EstadoDeDte): void {
  if (!transicionValida(desde, hacia)) throw new TransicionDeDteInvalida(desde, hacia);
}
