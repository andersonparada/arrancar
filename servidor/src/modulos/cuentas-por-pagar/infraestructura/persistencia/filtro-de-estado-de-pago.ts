import { sql, type SQL } from 'drizzle-orm';
import type { EstadoDePago } from '../../dominio/pagos.js';
import { documentos } from './documentos.tablas.js';
import type { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { expresionDeEstadoDePago } from './expresion-de-estado-de-pago.js';

/**
 * El estado de pago de un cargo vigente como condición, con la misma regla que `estadoDePagoDe` (`expresionDeEstadoDePago`).
 * La consulta base debe haberse creado con la fecha de hoy de la empresa: separa lo pagado de lo comprometido.
 */
export function condicionDeEstadoDePago(estado: EstadoDePago, base: ConsultaBaseDeDocumentos): SQL {
  const comprometido = sql`coalesce(${base.pagadoAlCargo.comprometido}, 0)`;
  const pagado = sql`(coalesce(${base.pagadoAlCargo.monto}, 0) - ${comprometido})`;
  const expresion = expresionDeEstadoDePago({ deuda: base.deudaDelCargo(), pagado, comprometido });
  return sql`(${documentos.estado} <> 'anulado' and ${documentos.tipo} <> 'nota_de_credito' and ${expresion} = ${estado})`;
}
