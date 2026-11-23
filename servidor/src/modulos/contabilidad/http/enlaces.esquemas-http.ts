import { z } from 'zod';
import { textoOpcional } from '../../core/compartido/http/esquemas-comunes.js';
import { ROLES_DE_CUENTA } from '../../core/contratos/contabilidad.contratos.js';

/** Forma de lo que llega al enlazar un rol; las reglas (la llave, la cuenta) las revisa el caso de uso. */
export const esquemaEnlace = z.object({
  llave: textoOpcional(100),
  cuentaId: z.uuid(),
});

/**
 * Las filas del Excel: el rol y la cuenta ya salen resueltos de sus columnas; la llave va por su nombre y el caso
 * de uso la busca entre las que ofrecen los módulos.
 */
export const esquemaEnlaceDeExcel = z.object({
  rol: z.enum(ROLES_DE_CUENTA),
  llaveNombre: textoOpcional(150),
  cuentaId: z.uuid(),
});

export const esquemaParamsRol = z.object({ rol: z.enum(ROLES_DE_CUENTA) });
export const esquemaParamsEnlace = z.object({ enlaceId: z.uuid() });

export type EnlaceSolicitado = z.infer<typeof esquemaEnlace>;
export type ParamsRol = z.infer<typeof esquemaParamsRol>;
export type ParamsEnlace = z.infer<typeof esquemaParamsEnlace>;
