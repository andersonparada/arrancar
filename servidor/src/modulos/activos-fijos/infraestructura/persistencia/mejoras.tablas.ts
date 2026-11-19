import { boolean, date, integer, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { ClaseDeMejora, EstadoDeMejora } from '../../dominio/mejora.js';
import { esquemaActivosFijos } from './esquema.tablas.js';
import { indicesDeMejora, llavesDeMejora, reglasDeMejora } from './mejoras.llaves-y-reglas.js';

/**
 * Las mejoras y los costos posteriores de los activos que ya están en uso (diseño §5.7). Agrupan costos y los tramos
 * de depreciación que crean. Nunca se borran: se anulan y quedan como rastro. Solo `politicaPorEmpresa()`.
 */
export const mejoras = esquemaActivosFijos.table(
  'mejoras',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoId: uuid().notNull(),
    numero: integer().notNull(),
    anioDeNumero: smallint().notNull(),
    clase: text().$type<ClaseDeMejora>().notNull(),
    fecha: date({ mode: 'string' }).notNull(),
    descripcion: text().notNull(),
    vidaUtilRestanteContableMeses: smallint(),
    noEsEdificacion: boolean().default(false).notNull(),
    estado: text().$type<EstadoDeMejora>().notNull().default('vigente'),
    anuladaEn: timestamp({ withTimezone: true }),
    anuladaPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('mejoras_id_empresa_unico').on(t.id, t.empresaId),
    ...llavesDeMejora(t),
    ...indicesDeMejora(t),
    ...reglasDeMejora(t),
    politicaPorEmpresa(),
  ],
);
