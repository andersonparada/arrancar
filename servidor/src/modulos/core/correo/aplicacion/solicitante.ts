/** Quién de soporte pide la operación y desde qué dirección (para la bitácora de superacceso). */
export interface Solicitante {
  readonly usuarioId: string;
  readonly direccionIp: string | null;
}
