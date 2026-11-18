import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { PARTES_DE_APERTURA, type ParteDeApertura } from '../../dominio/partes-de-apertura.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

export type { ParteDeApertura };

const partesEnTexto = PARTES_DE_APERTURA.map((parte) => `'${parte}'`).join(', ');

type ColumnasDeApertura = {
  parteDeApertura: AnyPgColumn;
  saldoInicialId: AnyPgColumn;
  saldoInicial: AnyPgColumn;
  tipo: AnyPgColumn;
  cuentaBancariaId: AnyPgColumn;
  fecha: AnyPgColumn;
  anuladoEn: AnyPgColumn;
};

/** La parte es una de las siete, cuelga de una cabecera y es saldo inicial toda parte menos el posfechado. */
const checksDeLaParte = (t: ColumnasDeApertura) => [
  check(
    'movimientos_parte_de_apertura_valida',
    sql`${t.parteDeApertura} is null or ${t.parteDeApertura} in (${sql.raw(partesEnTexto)})`,
  ),
  check(
    'movimientos_apertura_completa',
    sql`(${t.parteDeApertura} is not null) = (${t.saldoInicialId} is not null)
        and ${t.saldoInicial} = coalesce(${t.parteDeApertura} <> 'cheque_posfechado', false)`,
  ),
];

/** El tipo del movimiento concuerda con su parte. */
const checkDelTipoDeLaParte = (t: ColumnasDeApertura) =>
  check(
    'movimientos_tipo_de_la_parte',
    sql`${t.parteDeApertura} is null
        or (${t.parteDeApertura} in ('saldo_del_banco', 'saldo_global', 'error_del_banco') and ${t.tipo} in ('credito', 'debito'))
        or (${t.parteDeApertura} in ('cheque_en_circulacion', 'cheque_posfechado') and ${t.tipo} = 'cheque')
        or (${t.parteDeApertura} = 'deposito_en_transito' and ${t.tipo} = 'credito')
        or (${t.parteDeApertura} = 'debito_en_transito' and ${t.tipo} = 'debito')`,
  );

/**
 * Checks, índices y llave de las partidas de apertura: un solo saldo principal vigente por cuenta y una cabecera de la
 * que cuelga cada parte. La regla de fechas (partida `<=` corte, posfechado `>` corte) la revisa el dominio.
 */
export const restriccionesDeApertura = (t: ColumnasDeApertura) => [
  ...checksDeLaParte(t),
  checkDelTipoDeLaParte(t),
  uniqueIndex('movimientos_un_saldo_del_banco')
    .on(t.cuentaBancariaId)
    .where(sql`${t.parteDeApertura} in ('saldo_del_banco', 'saldo_global') and ${t.anuladoEn} is null`),
  index('movimientos_apertura_idx')
    .on(t.cuentaBancariaId, t.fecha)
    .where(sql`${t.saldoInicial}`),
  index('movimientos_saldo_inicial_idx').on(t.saldoInicialId),
  foreignKey({
    name: 'movimientos_saldo_inicial_fk',
    columns: [t.saldoInicialId],
    foreignColumns: [saldosIniciales.id],
  }),
];
