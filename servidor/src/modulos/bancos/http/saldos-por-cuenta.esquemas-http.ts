import { z } from 'zod';

/** La fecha de corte (`AAAA-MM-DD`; hoy si falta) y, si se quiere, una sola cuenta. */
export const esquemaFiltroDeSaldosPorCuenta = z.object({
  fecha: z.iso.date().optional(),
  cuentaBancariaId: z.uuid().optional(),
});

export type FiltroDeSaldosSolicitado = z.infer<typeof esquemaFiltroDeSaldosPorCuenta>;
