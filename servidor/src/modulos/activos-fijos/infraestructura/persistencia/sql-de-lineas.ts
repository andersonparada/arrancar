import { sql } from 'drizzle-orm';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import { costos } from './costos.tablas.js';
import { descartesDeLineas } from './descartes.tablas.js';

/** Lo que costó la línea para el activo: `total − iva + iva no acreditable` (el IVA que no se acredita va al costo). */
export const costoDeLineaSql = sql<string>`(${lineasDeDocumento.total} - ${lineasDeDocumento.iva} + ${lineasDeDocumento.ivaNoAcreditable})`;

/** El costo con signo: la línea de una nota de crédito resta. */
export const costoFirmadoSql = sql<string>`(case when ${documentos.tipo} = 'nota_de_credito' then -${costoDeLineaSql} else ${costoDeLineaSql} end)`;

/** Σ de los costos vigentes ya capitalizados de la línea, con signo. */
export const capitalizadoSql = sql<string>`(select coalesce(sum(${costos.monto}), 0) from ${costos}
  where ${costos.lineaDeDocumentoId} = ${lineasDeDocumento.id} and ${costos.estado} = 'vigente')`;

/** La línea se descartó en la bandeja y no se ha devuelto. */
export const descartadaSql = sql<boolean>`exists (select 1 from ${descartesDeLineas}
  where ${descartesDeLineas.lineaDeDocumentoId} = ${lineasDeDocumento.id} and ${descartesDeLineas.vigente})`;

/** La factura que corrige una nota ya tiene costos vigentes en algún activo. */
export const facturaCapitalizadaSql = sql<boolean>`exists (select 1 from ${costos}
  where ${costos.documentoDeCompraId} = ${documentos.documentoAfectadoId} and ${costos.estado} = 'vigente')`;

/** Una línea entra a la bandeja si está marcada como activo fijo o es de una nota de crédito de una factura capitalizada. */
export const marcadaParaCapitalizarSql = sql<boolean>`(${lineasDeDocumento.esActivoFijo}
  or (${documentos.tipo} = 'nota_de_credito' and ${facturaCapitalizadaSql}))`;
