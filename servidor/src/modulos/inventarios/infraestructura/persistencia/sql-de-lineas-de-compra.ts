import { sql } from 'drizzle-orm';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import { descartesDeLineas } from './descartes.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { repartosDeCosto } from './repartos-de-costo.tablas.js';

/** Lo que costó la línea para el inventario: `total − iva + iva no acreditable` (el IVA no acreditable y el IDP van al costo). */
export const costoDeLineaSql = sql<string>`(${lineasDeDocumento.total} - ${lineasDeDocumento.iva} + ${lineasDeDocumento.ivaNoAcreditable})`;

/** Lo recibido de una línea de factura: Σ del costo de sus entradas vigentes. */
const recibidoSql = sql`(select coalesce(sum(${movimientos.costoTotal}), 0) from ${movimientos}
  where ${movimientos.lineaDeDocumentoDeCompraId} = ${lineasDeDocumento.id} and ${movimientos.vigente}
    and ${movimientos.tipo} = 'entrada')`;

/** Lo que una nota de crédito aplicó a su línea: el costo de sus devoluciones más sus rebajas, vigentes y en positivo. */
const aplicadoDeNotaSql = sql`((select coalesce(-sum(${movimientos.costoTotal}), 0) from ${movimientos}
  where ${movimientos.lineaDeDocumentoDeCompraId} = ${lineasDeDocumento.id} and ${movimientos.vigente}
    and ${movimientos.tipo} = 'salida')
  + (select coalesce(-sum(${repartosDeCosto.monto}), 0) from ${repartosDeCosto}
      join ${movimientos} on ${movimientos.documentoId} = ${repartosDeCosto.documentoId}
        and ${movimientos.movimientoDeOrigenId} = ${repartosDeCosto.movimientoDeEntradaId}
     where ${movimientos.lineaDeDocumentoDeCompraId} = ${lineasDeDocumento.id} and ${movimientos.vigente}
       and ${movimientos.tipo} = 'valor'))`;

/** Lo aplicado a la línea: lo recibido en una factura o lo rebajado y devuelto en una nota de crédito. */
export const aplicadoSql = sql<string>`(case when ${documentos.tipo} = 'nota_de_credito' then ${aplicadoDeNotaSql} else ${recibidoSql} end)`;

/** La línea se descartó de la bandeja y no se ha devuelto. */
export const descartadaSql = sql<boolean>`exists (select 1 from ${descartesDeLineas}
  where ${descartesDeLineas.lineaDeDocumentoId} = ${lineasDeDocumento.id} and ${descartesDeLineas.vigente})`;

/** La factura que corrige una nota ya tiene entradas de recepciones vigentes (la nota entra a la bandeja por eso). */
export const facturaConEntradasSql = sql<boolean>`exists (select 1 from ${movimientos}
  where ${movimientos.documentoDeCompraId} = ${documentos.documentoAfectadoId} and ${movimientos.vigente}
    and ${movimientos.tipo} = 'entrada')`;

/** Entra a la bandeja la línea marcada de una factura, o cualquier línea de una nota de crédito de una factura recibida. */
export const entraALaBandejaSql = sql<boolean>`((${lineasDeDocumento.esInventario} and ${documentos.tipo} <> 'nota_de_credito')
  or (${documentos.tipo} = 'nota_de_credito' and ${facturaConEntradasSql}))`;
