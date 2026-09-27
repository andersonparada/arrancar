import { z } from 'zod';
import {
  correoOpcional,
  nombresYApellidos,
  nombreUsuario,
  textoObligatorio,
} from '../../validaciones/comunes.validaciones.js';

const esquemaAcceso = z.object({
  empresaId: z.uuid(),
  rolId: z.uuid(),
});

const accesos = z.array(esquemaAcceso).min(1, 'Asigne al menos una empresa.');

const contrasena = z.string().min(10, 'Use al menos 10 caracteres.').max(200);

export const esquemaNuevoUsuario = z.object({
  ...nombresYApellidos,
  /** Si se omite, se genera a partir de nombres y apellidos. */
  usuario: nombreUsuario.optional(),
  correo: correoOpcional,
  contrasena,
  accesos,
});

export const esquemaCambioUsuario = z.object({
  nombres: textoObligatorio(80).optional(),
  apellidos: z.string().trim().max(80).optional(),
  correo: correoOpcional.optional(),
  activo: z.boolean().optional(),
  accesos: accesos.optional(),
});

export const esquemaSugerenciaUsuario = z.object(nombresYApellidos);

export const esquemaCambioContrasena = z.object({ contrasena });

export const esquemaParamsUsuario = z.object({ usuarioId: z.uuid() });

export type NuevoUsuarioSolicitado = z.infer<typeof esquemaNuevoUsuario>;
export type CambioUsuario = z.infer<typeof esquemaCambioUsuario>;
export type SugerenciaUsuario = z.infer<typeof esquemaSugerenciaUsuario>;
export type CambioContrasena = z.infer<typeof esquemaCambioContrasena>;
export type ParamsUsuario = z.infer<typeof esquemaParamsUsuario>;
