import { z } from 'zod';
import { CAUSAS_DE_AJUSTE } from '../dominio/ajustes.js';

const LIMITE_POR_OMISION = 50;
/** El máximo es lo que se imprime de una vez (CP5-h). */
const LIMITE_MAXIMO = 2000;

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** R6: el rango (por omisión, el mes en curso), quién, cómo y en qué estado se pagó, las marcas de control y la página. */
export const esquemaFiltroDePagosRealizados = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
  forma: z
    .enum(['cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo', 'cheque_de_apertura'])
    .optional(),
  cuentaBancariaId: z.uuid().optional(),
  estado: z.enum(['vigentes', 'anulados', 'todos']).default('vigentes'),
  posfechados: comoBooleano.default(false),
  mismaPersona: comoBooleano.default(false),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
});

/** R7: el corte (hoy si falta), un proveedor y una cuenta bancaria. */
export const esquemaFiltroDeChequesPosfechados = z.object({
  corte: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
  cuentaBancariaId: z.uuid().optional(),
});

/** R8: el mes `AAAA-MM` (por omisión, el anterior), un proveedor y una causa de ajuste. */
export const esquemaFiltroDeAjustesDelMes = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes se escribe AAAA-MM.')
    .optional(),
  proveedorId: z.uuid().optional(),
  causa: z.enum(CAUSAS_DE_AJUSTE).optional(),
});

export type FiltroDePagosRealizadosSolicitado = z.output<typeof esquemaFiltroDePagosRealizados>;
export type FiltroDeChequesPosfechadosSolicitado = z.output<typeof esquemaFiltroDeChequesPosfechados>;
export type FiltroDeAjustesDelMesSolicitado = z.output<typeof esquemaFiltroDeAjustesDelMes>;

/** Separa lo que filtra de lo que pagina. */
export function separarPaginacionDePagos({ pagina, limite, ...solicitud }: FiltroDePagosRealizadosSolicitado) {
  return { solicitud, pagina: { pagina, limite } };
}
