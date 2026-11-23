import { sql } from 'drizzle-orm';
import { check, date, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { autoria, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { CASOS_DE_INICIO, type CasoDeInicio } from '../../dominio/inicio.js';
import { esquemaContabilidad } from './esquema.tablas.js';

const casosEnSql = sql.raw(CASOS_DE_INICIO.map((caso) => `'${caso}'`).join(', '));

/**
 * Desde cuándo lleva contabilidad cada empresa (una fila por empresa), con qué máscara de códigos y quiénes firman los
 * estados financieros (`docs/modulos/diseno-contabilidad.md` §5.1). La máscara queda fija desde la primera cuenta.
 */
export const inicios = esquemaContabilidad.table(
  'inicios',
  {
    empresaId: uuid()
      .primaryKey()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fecha: date({ mode: 'string' }).notNull(),
    caso: text().$type<CasoDeInicio>().notNull(),
    mascara: text().notNull(),
    plantilla: text(),
    iniciadaEn: timestamp({ withTimezone: true }),
    iniciadaPor: uuid(),
    firmaRepresentante: text(),
    firmaContador: text(),
    registroDelContador: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    check('inicios_caso_valido', sql`${t.caso} in (${casosEnSql})`),
    check('inicios_mascara_valida', sql`${t.mascara} ~ '^9+(\\.9+){3,5}$'`),
    check(
      'inicios_firma_representante_largo',
      sql`${t.firmaRepresentante} is null or char_length(btrim(${t.firmaRepresentante})) between 1 and 150`,
    ),
    check(
      'inicios_firma_contador_largo',
      sql`${t.firmaContador} is null or char_length(btrim(${t.firmaContador})) between 1 and 150`,
    ),
    check(
      'inicios_registro_largo',
      sql`${t.registroDelContador} is null or char_length(btrim(${t.registroDelContador})) between 1 and 30`,
    ),
    check('inicios_contador_completo', sql`(${t.firmaContador} is null) = (${t.registroDelContador} is null)`),
    politicaPorEmpresa(),
  ],
);
