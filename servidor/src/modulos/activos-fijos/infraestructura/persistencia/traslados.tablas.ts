import { boolean, date, integer, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { esquemaActivosFijos } from './esquema.tablas.js';
import { indicesDeTraslado, llavesDeTraslado, reglasDeTraslado } from './traslados.llaves-y-reglas.js';

/**
 * El historial de ubicación de los activos (diseño §5.11). La primera fila de cada activo es la del alta (`es_alta`,
 * sin boleta). No se guarda `hasta`: la ubicación vigente es la de mayor `(fecha, creado_en)` no anulada y su copia
 * está en `activos`.
 */
export const traslados = esquemaActivosFijos.table(
  'traslados',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    activoId: uuid().notNull(),
    esAlta: boolean().default(false).notNull(),
    grupoId: uuid(),
    numero: integer(),
    anioDeNumero: smallint(),
    fecha: date({ mode: 'string' }).notNull(),
    localidadId: uuid(),
    departamentoId: uuid(),
    responsable: text(),
    responsableUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    recibidoPor: text(),
    motivo: text(),
    inventarioId: uuid(),
    aBodega: boolean().default(false).notNull(),
    estado: text().$type<'vigente' | 'anulado'>().notNull().default('vigente'),
    anuladoEn: timestamp({ withTimezone: true }),
    anuladoPor: uuid(),
    motivoDeAnulacion: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('traslados_id_empresa_unico').on(t.id, t.empresaId),
    unique('traslados_grupo_activo_unico').on(t.grupoId, t.activoId),
    ...llavesDeTraslado(t),
    ...indicesDeTraslado(t),
    ...reglasDeTraslado(t),
    politicaPorEmpresa(),
  ],
);
