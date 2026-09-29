import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { conceptos } from './conceptos.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';
import { transferencias } from './transferencias.tablas.js';

/** El índice del flujo por concepto y la llave compuesta con la empresa: el concepto es siempre de la misma empresa. */
const restriccionesDelConcepto = (t: { conceptoId: AnyPgColumn; empresaId: AnyPgColumn; fecha: AnyPgColumn }) => [
  index('movimientos_concepto_fecha_idx').on(t.empresaId, t.conceptoId, t.fecha),
  foreignKey({
    name: 'movimientos_concepto_de_la_empresa_fk',
    columns: [t.conceptoId, t.empresaId],
    foreignColumns: [conceptos.id, conceptos.empresaId],
  }),
];

/**
 * Las notas de crédito y de débito de cada cuenta. El monto siempre es positivo
 * (el tipo dice la dirección) y nada se borra: se anula. Una sola nota de saldo
 * inicial vigente por cuenta. La seguridad por empresa (RLS) oculta las ajenas.
 */
export const movimientos = esquemaBancos.table(
  'movimientos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid()
      .references((): AnyPgColumn => cuentasBancarias.id)
      .notNull(),
    tipo: text().$type<'credito' | 'debito' | 'cheque'>().notNull(),
    fecha: date().notNull(),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    saldoInicial: boolean().default(false).notNull(),
    referencia: text(),
    beneficiario: text(),
    /**
     * El beneficiario normalizado por `bancos.nombre_para_comparar` (sin acentos, mayúsculas ni «S.A.»): la clave
     * de las sugerencias de concepto (P7). La calcula la base; nunca se escribe.
     */
    beneficiarioParaComparar: text().generatedAlwaysAs(sql`bancos.nombre_para_comparar(beneficiario)`),
    observaciones: text(),
    /**
     * Cómo se clasifica el dinero (H3b). Un original lo elige el usuario; transferencias, saldo inicial e
     * inversos los asigna el sistema (el inverso hereda). La llave foránea es compuesta con `empresa_id`: el
     * concepto siempre es de la misma empresa.
     */
    conceptoId: uuid().notNull(),
    /**
     * De qué módulo viene el movimiento y con qué documento se pagó o cobró (P6): los dos juntos o ninguno.
     * Sin llave foránea: el documento vive en el esquema de otro módulo. Un movimiento con origen lo fija el
     * módulo de origen, así que Bancos no lo reclasifica.
     */
    moduloDeOrigen: text(),
    documentoDeOrigenId: uuid(),
    /** Anulación a la antigua: solo la usan los cheques en un mes abierto (sin inverso, fuera del saldo). */
    anuladoEn: timestamp({ withTimezone: true }),
    motivoDeAnulacion: text(),
    /** La transferencia que la creó, si es una de sus dos notas. */
    transferenciaId: uuid().references((): AnyPgColumn => transferencias.id),
    /** La conciliación donde quedó marcado; null si sigue pendiente. */
    conciliacionId: uuid().references((): AnyPgColumn => conciliaciones.id),
    /** Cuándo y por qué se revirtió (creó su inverso); null si nunca se revirtió. */
    revertidoEn: timestamp({ withTimezone: true }),
    motivoDeReversion: text(),
    /** El movimiento original que revierte, si este es un inverso. */
    revierteAId: uuid().references((): AnyPgColumn => movimientos.id),
    /**
     * Número correlativo de su tipo (nota de crédito o de débito), con `anio_de_numero` si la empresa reinicia
     * cada año. Nulo en cheques, saldo inicial y las dos notas de una transferencia (esas llevan el de la transferencia).
     */
    numero: integer(),
    anioDeNumero: integer().notNull().default(0),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    index('movimientos_cuenta_fecha_idx').on(t.cuentaBancariaId, t.fecha),
    index('movimientos_beneficiario_para_comparar_idx')
      .on(t.empresaId, t.beneficiarioParaComparar, t.fecha)
      .where(sql`${t.beneficiarioParaComparar} is not null`),
    index('movimientos_transferencia_idx').on(t.transferenciaId),
    index('movimientos_conciliacion_idx').on(t.conciliacionId),
    index('movimientos_revierte_a_idx').on(t.revierteAId),
    ...restriccionesDelConcepto(t),
    /** Los cheques en circulación (reporte de cheques caducos): pocos y siempre los mismos filtros. */
    index('movimientos_cheques_en_circulacion_idx')
      .on(t.cuentaBancariaId, t.fecha)
      .where(
        sql`${t.tipo} = 'cheque' and ${t.conciliacionId} is null and ${t.revertidoEn} is null and ${t.anuladoEn} is null`,
      ),
    uniqueIndex('movimientos_un_saldo_inicial')
      .on(t.cuentaBancariaId)
      .where(sql`${t.saldoInicial} and ${t.anuladoEn} is null`),
    uniqueIndex('movimientos_numero_unico')
      .on(t.empresaId, t.tipo, t.anioDeNumero, t.numero)
      .where(sql`${t.numero} is not null`),
    check('movimientos_monto_positivo', sql`${t.monto} > 0`),
    check('movimientos_origen_completo', sql`(${t.moduloDeOrigen} is null) = (${t.documentoDeOrigenId} is null)`),
    check('movimientos_tipo_valido', sql`${t.tipo} in ('credito', 'debito', 'cheque')`),
    politicaPorEmpresa(),
  ],
);
