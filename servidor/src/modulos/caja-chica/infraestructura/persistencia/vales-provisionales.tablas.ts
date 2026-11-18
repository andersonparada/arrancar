import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, integer, numeric, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import {
  fechaDeAnulacionPosterior,
  restriccionesDeAnulacion,
  textoRecortado,
} from '../../../core/base-datos/restricciones.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';

/**
 * El efectivo que el custodio da desde el fondo a alguien para una compra, por justificar con documentos o vales de
 * gasto. Mientras está abierto cuenta como parte del fondo que no está en la caja. Comparte talonario con los vales de
 * gasto (`caja-chica.vales`).
 */
export const valesProvisionales = esquemaCajaChica.table(
  'vales_provisionales',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    numero: integer().notNull(),
    anioDeNumero: integer().notNull().default(0),
    fecha: date().notNull(),
    entregadoA: text().notNull(),
    /** El usuario de Arrancar a quien se entregó, si lo es; si se borra, el nombre queda. */
    entregadoAUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    monto: numeric({ precision: 14, scale: 2 }).notNull(),
    motivo: text().notNull(),
    estado: text().$type<'abierto' | 'liquidado' | 'anulado'>().notNull().default('abierto'),
    fechaDeLiquidacion: date(),
    liquidadoEn: timestamp({ withTimezone: true }),
    liquidadoPor: uuid(),
    /** Lo que regresó al fondo al liquidar. */
    devuelto: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'vales_provisionales_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }),
    check('vales_numero_positivo', sql`${t.numero} > 0`),
    check('vales_entregado_a_valido', sql`${t.entregadoA} is not null and ${textoRecortado(t.entregadoA, 150)}`),
    check('vales_monto_positivo', sql`${t.monto} > 0`),
    check('vales_motivo_valido', sql`${t.motivo} is not null and ${textoRecortado(t.motivo, 300)}`),
    check('vales_estado_valido', sql`${t.estado} in ('abierto', 'liquidado', 'anulado')`),
    check(
      'vales_liquidacion_completa',
      sql`(${t.estado} = 'liquidado') = (${t.fechaDeLiquidacion} is not null) and (${t.fechaDeLiquidacion} is not null) = (${t.liquidadoEn} is not null) and (${t.liquidadoEn} is not null) = (${t.liquidadoPor} is not null)`,
    ),
    check('vales_devuelto_valido', sql`${t.devuelto} >= 0 and ${t.devuelto} <= ${t.monto}`),
    check('vales_abierto_sin_devuelto', sql`${t.estado} = 'liquidado' or ${t.devuelto} = 0`),
    ...restriccionesDeAnulacion('vales', t),
    fechaDeAnulacionPosterior('vales', t),
    unique('vales_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    // Destino de la llave de los comprobantes que salieron de este vale (mismo fondo).
    unique('vales_llave_unica').on(t.id, t.empresaId, t.fondoId),
    index('vales_fondo_idx').on(t.fondoId, t.estado, t.fecha),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
