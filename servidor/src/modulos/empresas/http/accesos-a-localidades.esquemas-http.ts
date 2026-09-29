import { z } from 'zod';

export const esquemaParamsUsuarioDeAccesos = z.object({ usuarioId: z.uuid() });

/** El conjunto final de localidades del usuario. */
export const esquemaAccesosDeUsuario = z.object({ localidadIds: z.array(z.uuid()).max(5000) });

export type ParamsUsuarioDeAccesos = z.infer<typeof esquemaParamsUsuarioDeAccesos>;
export type AccesosDeUsuarioSolicitado = z.infer<typeof esquemaAccesosDeUsuario>;
