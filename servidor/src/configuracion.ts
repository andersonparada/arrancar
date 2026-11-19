import { z } from 'zod';
import { configurarMensajesDeValidacion } from './modulos/core/compartido/http/mensajes-de-validacion.js';

configurarMensajesDeValidacion();

/** Llave de 32 bytes en base64 (`openssl rand -base64 32`). */
const esquemaLlaveDeSecretos = z.string().refine((valor) => /^[A-Za-z0-9+/]{43}=$/.test(valor), {
  message: 'Debe ser una llave de 32 bytes en base64 (openssl rand -base64 32).',
});

export const esquemaConfiguracion = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PUERTO: z.coerce.number().int().positive().default(3100),
    URL_PUBLICA: z.url(),
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_PROPIETARIO: z.string().min(1).optional(),
    RUTA_ALMACENAMIENTO: z.string().default('./almacenamiento'),
    /** Programa qpdf (versión 11 o posterior) con que se revisan los PDF; ruta absoluta. */
    RUTA_QPDF: z.string().default('/usr/bin/qpdf'),
    /** `false` apaga la tarea diaria que borra archivos sueltos (apáguela antes de restaurar una base más vieja que los archivos). */
    DEPURAR_HUERFANOS: z
      .enum(['true', 'false'])
      .default('true')
      .transform((valor) => valor === 'true'),
    /** Servicio de tipo de cambio del Banguat (HTTPS); vacía, la URL oficial. Las pruebas apuntan a un servidor local. */
    URL_TIPO_DE_CAMBIO_BANGUAT: z.url().optional(),
    /** Si el servidor carga solo los tipos de cambio del Banguat; vacía, apagada hasta hacer las comprobaciones C-1 a C-4. */
    CARGAR_TIPOS_DE_CAMBIO: z
      .enum(['true', 'false'])
      .optional()
      .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
    RUTA_CLIENTE: z.string().optional(),
    /** Archivo JSON con la configuración propia de este servidor (nivel instalación). */
    RUTA_CONFIG_INSTALACION: z.string().optional(),
    DURACION_SESION_DIAS: z.coerce.number().int().positive().default(30),
    SUPERACCESO_USUARIO: z
      .string()
      .regex(/^[a-z]{3,30}$/, 'Solo letras minúsculas, de 3 a 30.')
      .optional(),
    SUPERACCESO_CONTRASENA: z.string().min(12).optional(),
    /**
     * Llave con que se cifra la contraseña del servidor de correo (AES-256-GCM). Vive solo en el entorno, fuera de la
     * base y de los respaldos; sin ella no se puede guardar esa contraseña ni enviar correos.
     */
    CLAVE_SECRETOS: esquemaLlaveDeSecretos.optional(),
    /** La llave anterior, mientras se rota: lo cifrado con ella se sigue leyendo. */
    CLAVE_SECRETOS_ANTERIOR: esquemaLlaveDeSecretos.optional(),
    /** Solo desarrollo: deja apuntar el servidor de correo a nombres y direcciones de la red interna (Mailpit). */
    CORREO_PERMITIR_RED_INTERNA: z
      .enum(['true', 'false'])
      .default('false')
      .transform((valor) => valor === 'true'),
    /**
     * Solo desarrollo: nombre o dirección del servidor de correo de mentira (Mailpit). Con ella los correos salen por
     * SMTP sin cifrado y sin credenciales a ese servidor, en vez de al que guarda Soporte (que igual debe estar activo).
     */
    CORREO_DESARROLLO_SERVIDOR: z.string().trim().min(1).max(253).optional(),
    /** El puerto SMTP del servidor de desarrollo (Mailpit escucha en el 1025). */
    CORREO_DESARROLLO_PUERTO: z.coerce.number().int().min(1).max(65535).default(1025),
  })
  .refine((c) => !(c.NODE_ENV === 'production' && c.CORREO_DESARROLLO_SERVIDOR), {
    path: ['CORREO_DESARROLLO_SERVIDOR'],
    message: 'No se permite en producción: mandaría el correo sin cifrar a un servidor de mentira.',
  })
  .refine((c) => !(c.NODE_ENV === 'production' && c.CORREO_PERMITIR_RED_INTERNA), {
    path: ['CORREO_PERMITIR_RED_INTERNA'],
    message: 'No se permite en producción.',
  })
  .refine((c) => !c.CLAVE_SECRETOS_ANTERIOR || c.CLAVE_SECRETOS, {
    path: ['CLAVE_SECRETOS_ANTERIOR'],
    message: 'Solo tiene sentido junto con CLAVE_SECRETOS.',
  });

export type Configuracion = z.infer<typeof esquemaConfiguracion>;

/**
 * Lee y valida las variables de entorno una sola vez; las vacías cuentan como no
 * definidas. Detiene el arranque con un mensaje claro si falta alguna obligatoria.
 */
function cargarConfiguracion(): Configuracion {
  const definidas = Object.fromEntries(Object.entries(process.env).filter(([, valor]) => valor !== ''));
  const resultado = esquemaConfiguracion.safeParse(definidas);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración inválida en el entorno:\n${detalle}`);
  }
  return resultado.data;
}

export const configuracion = cargarConfiguracion();

export const esProduccion = configuracion.NODE_ENV === 'production';

export const esPrueba = configuracion.NODE_ENV === 'test';
