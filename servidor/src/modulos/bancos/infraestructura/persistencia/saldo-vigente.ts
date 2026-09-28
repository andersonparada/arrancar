import { sql } from 'drizzle-orm';
import { movimientos } from './movimientos.tablas.js';

/**
 * Créditos menos débitos de las filas de `bancos.movimientos` que se agregan; la
 * consulta debe dejar fuera los anulados. Con cero filas da 0.00.
 */
export const saldoVigente = sql`coalesce(sum(case when ${movimientos.tipo} = 'credito' then ${movimientos.monto} else -${movimientos.monto} end), 0)::numeric(14, 2)`;
