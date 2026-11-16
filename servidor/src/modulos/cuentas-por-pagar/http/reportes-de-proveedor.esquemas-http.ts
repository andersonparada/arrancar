import { z } from 'zod';

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');

/** R3: el proveedor, el rango (por omisión, del primer día del mes a hoy), la presentación y si se ven los anulados. */
export const esquemaFiltroDeEstadoDeCuenta = z.object({
  proveedorId: z.uuid(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  mostrarAnulados: comoBooleano.default(false),
  presentacion: z.enum(['interna', 'para_el_proveedor']).default('interna'),
});

/** R4: el corte (hoy si falta), un proveedor y si salen también las notas sin saldo. */
export const esquemaFiltroDeSaldosAFavor = z.object({
  corte: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
  incluirSinSaldo: comoBooleano.default(false),
});

/** R5: hasta qué pago prometido (por omisión, ayer) y un proveedor. */
export const esquemaFiltroDeContrasenasPorPagar = z.object({
  pagoPrometidoHasta: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
});

export type FiltroDeEstadoDeCuentaSolicitado = z.output<typeof esquemaFiltroDeEstadoDeCuenta>;
export type FiltroDeSaldosAFavorSolicitado = z.output<typeof esquemaFiltroDeSaldosAFavor>;
export type FiltroDeContrasenasPorPagarSolicitado = z.output<typeof esquemaFiltroDeContrasenasPorPagar>;
