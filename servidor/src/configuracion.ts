import { z } from 'zod';
import { configurarMensajesDeValidacion } from './modulos/core/compartido/http/mensajes-de-validacion.js';

configurarMensajesDeValidacion();

const esquemaConfiguracion = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUERTO: z.coerce.number().int().positive().default(3100),
  URL_PUBLICA: z.url(),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_PROPIETARIO: z.string().min(1).optional(),
  RUTA_ALMACENAMIENTO: z.string().default('./almacenamiento'),
  /** Programa qpdf (versión 11 o posterior) con que se revisan los PDF; ruta absoluta. */
  RUTA_QPDF: z.string().default('/usr/bin/qpdf'),
  RUTA_CLIENTE: z.string().optional(),
  /** Archivo JSON con la configuración propia de este servidor (nivel instalación). */
  RUTA_CONFIG_INSTALACION: z.string().optional(),
  DURACION_SESION_DIAS: z.coerce.number().int().positive().default(30),
  SUPERACCESO_USUARIO: z
    .string()
    .regex(/^[a-z]{3,30}$/, 'Solo letras minúsculas, de 3 a 30.')
    .optional(),
  SUPERACCESO_CONTRASENA: z.string().min(12).optional(),
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
