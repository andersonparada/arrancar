import { z } from 'zod';

/** Desde la aplicación, la cuenta y la empresa; la instalación la cambia soporte en su panel. */
const nivel = z.enum(['cuenta', 'empresa']);

export const esquemaParamsConfiguracion = z.object({ clave: z.string().min(1).max(150) });

export const esquemaValorConfiguracion = z.object({
  nivel,
  valor: z.unknown().refine((v) => v !== undefined, 'Indique el valor.'),
});

export const esquemaConsultaRestablecer = z.object({ nivel });

export type ParamsConfiguracion = z.infer<typeof esquemaParamsConfiguracion>;
export type ValorConfiguracion = z.infer<typeof esquemaValorConfiguracion>;
export type ConsultaRestablecer = z.infer<typeof esquemaConsultaRestablecer>;
