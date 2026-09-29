import { z } from 'zod';
import { correoOpcional, nombresYApellidos, textoObligatorio } from '../../compartido/http/esquemas-comunes.js';
import { PATRON_USUARIO } from '../dominio/nombre-de-usuario.js';

/** Nombre de usuario escrito a mano: solo letras, de 3 a 30, en minúsculas. */
export const nombreUsuario = z
  .string()
  .trim()
  .toLowerCase()
  .regex(PATRON_USUARIO, 'Use de 3 a 30 letras, sin números, espacios ni tildes.');

const empresaIds = z.array(z.uuid()).min(1, 'Asigne al menos una empresa.');

const clavesDePermisos = z.array(z.string().trim().min(1).max(100)).max(500);

const contrasena = z.string().min(10, 'Use al menos 10 caracteres.').max(200);

export const esquemaNuevoUsuario = z.object({
  ...nombresYApellidos,
  /** Si se omite, se genera a partir de nombres y apellidos. */
  usuario: nombreUsuario.optional(),
  correo: correoOpcional,
  contrasena,
  empresaIds,
  /** Solo los acepta quien tiene `usuarios.asignar-permisos`. */
  rolIds: z.array(z.uuid()).optional(),
  permisos: clavesDePermisos.optional(),
});

export const esquemaCambioUsuario = z.object({
  nombres: textoObligatorio(80).optional(),
  apellidos: z.string().trim().max(80).optional(),
  correo: correoOpcional.optional(),
  activo: z.boolean().optional(),
  empresaIds: empresaIds.optional(),
});

/** Reemplaza todos los roles y los permisos directos del usuario. */
export const esquemaAsignaciones = z.object({
  rolIds: z.array(z.uuid()).max(100),
  permisos: clavesDePermisos,
});

export const esquemaSugerenciaUsuario = z.object(nombresYApellidos);

export const esquemaCambioContrasena = z.object({ contrasena });

export const esquemaParamsUsuario = z.object({ usuarioId: z.uuid() });

export type NuevoUsuarioSolicitado = z.infer<typeof esquemaNuevoUsuario>;
export type CambioUsuario = z.infer<typeof esquemaCambioUsuario>;
export type AsignacionesSolicitadas = z.infer<typeof esquemaAsignaciones>;
export type SugerenciaUsuario = z.infer<typeof esquemaSugerenciaUsuario>;
export type CambioContrasena = z.infer<typeof esquemaCambioContrasena>;
export type ParamsUsuario = z.infer<typeof esquemaParamsUsuario>;
