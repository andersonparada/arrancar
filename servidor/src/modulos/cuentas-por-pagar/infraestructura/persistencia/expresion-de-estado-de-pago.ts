import { sql, type SQL } from 'drizzle-orm';

/** Las tres cifras de un cargo como expresiones de SQL (o nombres de columna con `sql.raw`). */
export interface CifrasDeSqlDelPago {
  deuda: SQL;
  /** Lo pagado hasta hoy o al corte. */
  pagado: SQL;
  /** Lo pagado con fecha posterior a hoy o al corte. */
  comprometido: SQL;
}

/**
 * El estado de pago como expresión `case` de SQL. Copia la regla de `estadoDePagoDe` (dominio/pagos.ts): la usan R2 y
 * el filtro de la lista, y una prueba compara las dos sobre una grilla de casos.
 */
export function expresionDeEstadoDePago({ deuda, pagado, comprometido }: CifrasDeSqlDelPago): SQL {
  return sql`(case when ${deuda} <= 0 then 'pagado'
       when ${deuda} - ${comprometido} <= 0 then 'comprometido'
       when ${pagado} > 0 then 'en_parte'
       when ${comprometido} > 0 then 'comprometido_en_parte'
       else 'pendiente' end)`;
}
