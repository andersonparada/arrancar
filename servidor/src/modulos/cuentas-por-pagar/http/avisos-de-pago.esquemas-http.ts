import { z } from 'zod';

export const esquemaParamsDeAviso = z.object({ id: z.uuid() });
export const esquemaParamsDeAvisoCorreo = z.object({ id: z.uuid(), correoId: z.uuid() });

/** Los destinatarios son ids de contactos o del proveedor ya registrados (nunca direcciones escritas): de 1 a 10. */
export const esquemaEnvioDeAviso = z.object({
  destinatarios: z
    .array(z.object({ origen: z.enum(['tercero', 'contacto']), origenId: z.uuid() }))
    .min(1, 'Escoja a quién enviarlo.')
    .max(10, 'Un aviso no puede ir a más de 10 destinatarios.'),
  copiaALaEmpresa: z.boolean(),
});

/** El motivo se valida en el caso de uso (de 1 a 300 caracteres). */
export const esquemaCancelacionDeAviso = z.object({ motivo: z.string() });

export type ParamsDeAviso = z.infer<typeof esquemaParamsDeAviso>;
export type ParamsDeAvisoCorreo = z.infer<typeof esquemaParamsDeAvisoCorreo>;
export type EnvioDeAvisoSolicitado = z.infer<typeof esquemaEnvioDeAviso>;
export type CancelacionDeAvisoSolicitada = z.infer<typeof esquemaCancelacionDeAviso>;
