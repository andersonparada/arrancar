export const ESTADOS_DE_CORREO = ['pendiente', 'enviando', 'enviado', 'fallido', 'cancelado'] as const;
export type EstadoDeCorreo = (typeof ESTADOS_DE_CORREO)[number];

/** Máximo de intentos de envío; el octavo que falla deja el correo `fallido`. */
export const MAXIMO_DE_INTENTOS = 8;
