/**
 * Campos que nunca deben aparecer en los registros (C2 de la revisión de seguridad): contraseñas del
 * servidor de correo y de cualquier otro lado, y las credenciales de `auth` de nodemailer. Los comodines
 * de pino cubren un nivel de profundidad, por eso se listan la raíz y un nivel.
 */
export const CAMPOS_SECRETOS_DEL_REGISTRO = [
  'contrasena',
  'pass',
  'auth',
  '*.contrasena',
  '*.pass',
  '*.auth',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

/** Opción `redact` de pino: los campos secretos se muestran como `[Redacted]`. */
export const REDACCION_DEL_REGISTRO = { paths: CAMPOS_SECRETOS_DEL_REGISTRO, censor: '[Redacted]' };
