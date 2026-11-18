import { sql, type SQL } from 'drizzle-orm';
import type { EstadoDePago } from '../../dominio/pagos.js';
import { documentos } from './documentos.tablas.js';
import type { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';

/**
 * El estado de pago de un cargo vigente como condición, con la misma regla que `estadoDePagoDe`: sin saldo es `pagado`
 * (o `comprometido` si hay pagos con fecha posterior a hoy); con saldo es `en_parte` si ya se pagó o comprometió algo.
 */
export function condicionDeEstadoDePago(estado: EstadoDePago, hoy: string, base: ConsultaBaseDeDocumentos): SQL {
  const saldo = base.saldoDelCargo();
  const posfechados = sql`exists (select 1 from jsonb_array_elements(coalesce(${base.pagadoAlCargo.pagos}, '[]'::jsonb)) p
    where p->>'fecha' > ${hoy})`;
  const conPagos = sql`coalesce(${base.pagadoAlCargo.monto}, 0) > 0`;
  const porEstado: Record<EstadoDePago, SQL> = {
    pagado: sql`${saldo} <= 0 and not ${posfechados}`,
    comprometido: sql`${saldo} <= 0 and ${posfechados}`,
    en_parte: sql`${saldo} > 0 and ${conPagos}`,
    pendiente: sql`${saldo} > 0 and not ${conPagos}`,
  };
  return sql`(${documentos.estado} <> 'anulado' and ${documentos.tipo} <> 'nota_de_credito' and ${porEstado[estado]})`;
}
