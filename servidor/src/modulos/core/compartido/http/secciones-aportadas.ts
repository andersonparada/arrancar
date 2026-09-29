import { z } from 'zod';
import { SeccionInvalida } from '../aplicacion/errores-de-seccion.js';

/**
 * Las secciones que otros módulos aportan al formulario de Empresas o de Proveedores:
 * `secciones: { '<clave-del-modulo>': { ... } }`. Aquí solo se valida su forma; cada módulo valida la suya
 * con `interpretarSeccion` cuando recibe el aviso.
 */
export const seccionesAportadas = z.record(z.string(), z.unknown()).default({});

/**
 * Valida la sección de un módulo con su esquema.
 * @throws SeccionInvalida con un problema por campo, con el prefijo `secciones.<clave>.`.
 */
export function interpretarSeccion<Datos>(clave: string, esquema: z.ZodType<Datos>, valor: unknown): Datos {
  const resultado = esquema.safeParse(valor);
  if (resultado.success) return resultado.data;
  const problemas = resultado.error.issues.map((problema) => ({
    campo: ['secciones', clave, ...problema.path].join('.'),
    mensaje: problema.message,
  }));
  throw new SeccionInvalida(problemas);
}
