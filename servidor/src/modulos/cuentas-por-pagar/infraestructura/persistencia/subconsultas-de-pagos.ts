import { eq, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { PagoVigenteDelCargo } from '../../dominio/pagos.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { aplicacionesDeReintegros } from './aplicaciones-de-reintegros.tablas.js';
import { pagos } from './pagos.tablas.js';

/** Lo que cada pago vigente entrega a un cargo, como lo arma `jsonb_agg` (el monto va como texto para no perder centavos). */
type PagoComoJson = { fecha: string; monto: string };

/** Los pagos vigentes de un cargo como los trae la base: JSON, o nulo si el cargo no tiene. */
export function pagosVigentesDe(pagosEnJson: PagoComoJson[] | null): PagoVigenteDelCargo[] {
  return (pagosEnJson ?? []).map(({ fecha, monto }) => ({ fecha, montoCentavos: aCentavos(monto) }));
}

/**
 * Lo que los pagos y los reintegros vigentes rebajaron, por cargo y por nota, con índices parciales `where vigente`. Cada
 * pago trae su fecha para que el dominio separe lo pagado de lo comprometido con «hoy» de la empresa (§2.4).
 */
export class SubconsultasDePagos {
  private readonly transaccion = transaccionEnCurso();

  /** Lo que los pagos vigentes entregaron a cada cargo, y cuándo. */
  readonly pagadoAlCargo = this.transaccion
    .select({
      cargoId: aplicacionesDePagos.cargoId,
      monto: sql<string>`sum(${aplicacionesDePagos.monto})`.as('monto_pagado'),
      pagos: sql<
        PagoComoJson[]
      >`jsonb_agg(jsonb_build_object('fecha', ${pagos.fecha}, 'monto', ${aplicacionesDePagos.monto}::text))`.as(
        'pagos_vigentes',
      ),
    })
    .from(aplicacionesDePagos)
    .innerJoin(pagos, eq(pagos.id, aplicacionesDePagos.pagoId))
    .where(eq(aplicacionesDePagos.vigente, true))
    .groupBy(aplicacionesDePagos.cargoId)
    .as('pagado_al_cargo');

  /** Lo que los reintegros vigentes devolvieron contra cada nota de crédito, y cuántos son. */
  readonly reintegradoDeLaNota = this.transaccion
    .select({
      notaId: aplicacionesDeReintegros.notaId,
      monto: sql<string>`sum(${aplicacionesDeReintegros.monto})`.as('monto_reintegrado'),
      vigentes: sql<number>`count(*)`.mapWith(Number).as('reintegros_vigentes'),
    })
    .from(aplicacionesDeReintegros)
    .where(eq(aplicacionesDeReintegros.vigente, true))
    .groupBy(aplicacionesDeReintegros.notaId)
    .as('reintegrado_de_la_nota');
}
