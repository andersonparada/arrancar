import { z } from 'zod';

export const esquemaInicioSesion = z.object({
  usuario: z.string().trim().toLowerCase().min(1, 'Ingrese su usuario.').max(30),
  contrasena: z.string().min(1, 'Ingrese la contraseña.').max(200),
});

export const esquemaCambioEmpresa = z.object({
  empresaId: z.uuid(),
});

export type InicioSesion = z.infer<typeof esquemaInicioSesion>;
export type CambioEmpresa = z.infer<typeof esquemaCambioEmpresa>;
