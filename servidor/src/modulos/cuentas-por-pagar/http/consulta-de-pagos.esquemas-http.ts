import { z } from 'zod';

const LIMITE_POR_OMISION = 50;
const LIMITE_MAXIMO = 200;

const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** La lista de pagos: por omisión los vigentes; `posfechado=true` deja los cheques comprometidos. */
export const esquemaListaDePagos = z.object({
  proveedorId: z.uuid().optional(),
  contrasenaId: z.uuid().optional(),
  retiroId: z.uuid().optional(),
  forma: z
    .enum(['cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo', 'cheque_de_apertura'])
    .optional(),
  estado: z.enum(['vigente', 'anulado', 'todos']).default('vigente'),
  posfechado: comoBooleano.optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  cuentaBancariaId: z.uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

export type ListaDePagosSolicitada = z.output<typeof esquemaListaDePagos>;
