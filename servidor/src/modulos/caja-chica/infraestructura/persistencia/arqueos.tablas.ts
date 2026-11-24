import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import {
  restriccionesDeEstadoDelArqueo,
  restriccionesDeLaDiferenciaDelArqueo,
  restriccionesDeLosDatosDelArqueo,
} from './arqueos.restricciones.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';

/** Una línea del conteo de un arqueo: cuántos billetes o monedas de una denominación (en centavos). */
export interface LineaDeConteo {
  denominacionCentavos: number;
  cantidad: number;
}

/**
 * Un arqueo: el conteo del efectivo del fondo y su comparación con lo que el sistema esperaba. No se edita: se anula.
 * Guarda lo que decía el sistema al contar (monto, pendiente, vales y esperado) para que el acta no cambie después.
 * La diferencia negativa es un faltante; la positiva, un sobrante (los dos nacen como comprobantes del fondo).
 */
export const arqueos = esquemaCajaChica.table(
  'arqueos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    /** Del correlativo `caja-chica.arqueos`. */
    numero: integer().notNull(),
    anioDeNumero: integer().notNull().default(0),
    realizadoEn: timestamp({ withTimezone: true }).notNull(),
    /** Quien registra el arqueo (quien contó). */
    arqueadoPor: uuid()
      .notNull()
      .references(() => usuarios.id),
    /** Su nombre completo al contar, copiado: el acta lo imprime y no cambia si después se edita el usuario. */
    arqueadoPorNombre: text().notNull().default(''),
    /** El custodio vigente al contar, copiado: firma del acta. */
    custodio: text().notNull(),
    custodioUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    loHizoElCustodio: boolean().notNull().default(false),
    conteo: jsonb().$type<LineaDeConteo[]>().notNull(),
    efectivoContado: numeric({ precision: 14, scale: 2 }).notNull(),
    /** Cheques de reposición aún sin cambiar que están en el fondo. */
    valoresPorCambiar: numeric({ precision: 14, scale: 2 }).notNull().default('0'),
    montoDelFondo: numeric({ precision: 14, scale: 2 }).notNull(),
    pendienteDeReponer: numeric({ precision: 14, scale: 2 }).notNull(),
    valesAbiertos: numeric({ precision: 14, scale: 2 }).notNull(),
    efectivoEsperado: numeric({ precision: 14, scale: 2 }).notNull(),
    diferencia: numeric({ precision: 14, scale: 2 }).notNull(),
    comprobantesCompletos: boolean().notNull(),
    motivoDeDiferencia: text(),
    observaciones: text(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    /** Fecha contable de la anulación. */
    fechaDeAnulacion: date(),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'arqueos_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }),
    ...restriccionesDeLosDatosDelArqueo(t),
    ...restriccionesDeLaDiferenciaDelArqueo(t),
    ...restriccionesDeEstadoDelArqueo(t),
    unique('arqueos_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    // Destino de las llaves de lo que apunta a un arqueo del mismo fondo (el faltante, el sobrante, la entrega).
    unique('arqueos_llave_unica').on(t.id, t.empresaId, t.fondoId),
    index('arqueos_fondo_idx').on(t.fondoId, t.realizadoEn.desc()),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
