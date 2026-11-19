import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import { esquemaInventarios } from './esquema.tablas.js';

/**
 * Las líneas del libro que se apartaron de la bandeja «Por recibir» porque eran gasto (§5.16). Descartar una línea
 * marcada le quita la marca de inventario en el libro (`quito_la_marca`), y devolverla a la bandeja se la vuelve a
 * poner; esta tabla queda como la historia con el motivo. La llave a la línea borra el descarte con ella: su rastro ya
 * está en la auditoría (`descartar`).
 */
export const descartesDeLineas = esquemaInventarios.table(
  'descartes_de_lineas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    documentoDeCompraId: uuid().notNull(),
    lineaDeDocumentoId: uuid().notNull(),
    motivo: text().notNull(),
    /** Si el descarte quitó la marca de inventario del libro: solo entonces devolverlo la vuelve a poner. */
    quitoLaMarca: boolean().notNull(),
    vigente: boolean().default(true).notNull(),
    devueltoEn: timestamp({ withTimezone: true }),
    devueltoPor: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'descartes_de_lineas_linea_fk',
      columns: [t.lineaDeDocumentoId, t.documentoDeCompraId, t.empresaId],
      foreignColumns: [lineasDeDocumento.id, lineasDeDocumento.documentoId, lineasDeDocumento.empresaId],
    }).onDelete('cascade'),
    uniqueIndex('descartes_de_lineas_vigente_unico')
      .on(t.lineaDeDocumentoId)
      .where(sql`${t.vigente}`),
    index('descartes_de_lineas_documento_idx').on(t.documentoDeCompraId),
    check('descartes_de_lineas_motivo_largo', sql`char_length(btrim(${t.motivo})) between 1 and 300`),
    check('descartes_de_lineas_devolucion', sql`(not ${t.vigente}) = (${t.devueltoEn} is not null)`),
    politicaPorEmpresa(),
  ],
);
