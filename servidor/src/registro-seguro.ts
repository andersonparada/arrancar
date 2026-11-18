/**
 * Campos que nunca deben aparecer en los registros (C2 de la revisión de seguridad): contraseñas del
 * servidor de correo y de cualquier otro lado, y las credenciales de `auth` de nodemailer. Los comodines
 * de pino cubren un nivel por asterisco, por eso se listan la raíz y hasta dos niveles.
 */
export const CAMPOS_SECRETOS_DEL_REGISTRO = [
  'contrasena',
  '*.contrasena',
  '*.*.contrasena',
  'pass',
  '*.pass',
  '*.*.pass',
  'password',
  '*.password',
  '*.*.password',
  'contrasenaNueva',
  '*.contrasenaNueva',
  '*.*.contrasenaNueva',
  'contrasena_cifrada',
  '*.contrasena_cifrada',
  '*.*.contrasena_cifrada',
  'clave',
  '*.clave',
  '*.*.clave',
  'token',
  '*.token',
  '*.*.token',
  'CLAVE_SECRETOS',
  '*.CLAVE_SECRETOS',
  '*.*.CLAVE_SECRETOS',
  'auth',
  '*.auth',
  '*.*.auth',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

/** Opción `redact` de pino: los campos secretos se muestran como `[Redacted]`. */
export const REDACCION_DEL_REGISTRO = { paths: CAMPOS_SECRETOS_DEL_REGISTRO, censor: '[Redacted]' };
