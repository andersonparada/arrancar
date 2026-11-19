import { z } from 'zod';
import { PUERTOS_DEL_SERVIDOR, SEGURIDADES_DEL_SERVIDOR } from '../dominio/servidor-de-correo.js';

/**
 * Lo que Soporte guarda. `seguridad` no admite `ninguna` y el puerto solo 465 o 587: la regla vive también en el
 * dominio y en el `check` de la tabla. `contrasena` es de solo escritura; si falta, se conserva la guardada.
 */
export const esquemaServidorDeCorreo = z.object({
  servidor: z.string().trim().min(1, 'Campo obligatorio.').max(253),
  puerto: z
    .number()
    .int()
    .refine((puerto) => (PUERTOS_DEL_SERVIDOR as readonly number[]).includes(puerto), {
      message: 'Use el puerto 465 o el 587.',
    }),
  seguridad: z.enum(SEGURIDADES_DEL_SERVIDOR),
  usuario: z.string().trim().min(1, 'Campo obligatorio.').max(254),
  contrasena: z.string().min(1).max(500).optional(),
  remitenteDireccion: z.string().trim().min(3).max(254),
  remitenteNombre: z.string().trim().min(1, 'Campo obligatorio.').max(80),
  activo: z.boolean(),
});

export const esquemaPruebaDeCorreo = z.object({ destino: z.string().trim().min(3).max(254) });

export type ServidorDeCorreoSolicitado = z.infer<typeof esquemaServidorDeCorreo>;
export type PruebaDeCorreoSolicitada = z.infer<typeof esquemaPruebaDeCorreo>;
