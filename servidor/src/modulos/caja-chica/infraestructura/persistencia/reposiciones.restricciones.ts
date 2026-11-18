import { sql } from 'drizzle-orm';
import { check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  fechaDeAnulacionPosterior,
  restriccionesDeAnulacion,
  textoRecortado,
} from '../../../core/base-datos/restricciones.js';

/** Las columnas de `reposiciones` que usan estos checks. */
type T = Record<
  | 'numero'
  | 'fecha'
  | 'forma'
  | 'monto'
  | 'movimientoId'
  | 'custodio'
  | 'estado'
  | 'fechaDeAnulacion'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Reglas de la reposición: número, forma (con o sin movimiento de Bancos), monto y custodio. */
export const restriccionesDeLaReposicion = (t: T) => [
  check('reposiciones_numero_positivo', sql`${t.numero} > 0`),
  check('reposiciones_forma_valida', sql`${t.forma} in ('cheque', 'nota_de_debito', 'compensada_al_cerrar')`),
  check('reposiciones_monto_positivo', sql`${t.monto} > 0`),
  check(
    'reposiciones_movimiento_de_su_forma',
    sql`(${t.forma} = 'compensada_al_cerrar') = (${t.movimientoId} is null)`,
  ),
  check('reposiciones_custodio_valido', sql`${t.custodio} is not null and ${textoRecortado(t.custodio, 150)}`),
];

/** Estado (vigente o anulada) y anulación completa, con su fecha contable. */
export const restriccionesDeEstadoDeLaReposicion = (t: T) => [
  check('reposiciones_estado_valido', sql`${t.estado} in ('vigente', 'anulada')`),
  ...restriccionesDeAnulacion('reposiciones', t, 'anulada'),
  fechaDeAnulacionPosterior('reposiciones', t),
];
