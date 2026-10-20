import { z } from 'zod';

const periodo = (campo: string) => z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, `Escriba "${campo}" como AAAA-MM.`);

/** Rango de períodos (`AAAA-MM`, ambos incluidos); `incluirFueraDelLibro` solo cuenta en compras por proveedor. */
export const esquemaConsultaDeAnalisis = z.object({
  desde: periodo('desde'),
  hasta: periodo('hasta'),
  incluirFueraDelLibro: z.enum(['true', 'false']).default('false'),
});
export type ConsultaDeAnalisisSolicitada = z.infer<typeof esquemaConsultaDeAnalisis>;
