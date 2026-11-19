import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { politicaPorAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { textoRecortado } from '../../../core/base-datos/restricciones.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { arqueos } from './arqueos.tablas.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { fondos } from './fondos.tablas.js';

/**
 * El historial de custodios de cada fondo; el vigente es el que no tiene `hasta`. El custodio es el nombre de quien
 * lleva el efectivo y, si es usuario de Arrancar, su `id` (si se borra, el nombre queda). El disparador
 * `caja_chica.asignar_fondo_al_custodio` le da acceso al fondo al nombrarlo.
 */
export const custodiosDeFondos = esquemaCajaChica.table(
  'custodios_de_fondos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    fondoId: uuid().notNull(),
    custodio: text().notNull(),
    custodioUsuarioId: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    desde: date().notNull(),
    hasta: date(),
    /** Nulo solo en el primero (lo revisa el dominio). */
    motivoDelCambio: text(),
    /** El arqueo que se hizo al entregar el fondo (opcional, con aviso). */
    arqueoDeEntregaId: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'custodios_fondo_fk',
      columns: [t.fondoId, t.empresaId],
      foreignColumns: [fondos.id, fondos.empresaId],
    }),
    foreignKey({
      name: 'custodios_arqueo_de_entrega_fk',
      columns: [t.arqueoDeEntregaId, t.empresaId, t.fondoId],
      foreignColumns: [arqueos.id, arqueos.empresaId, arqueos.fondoId],
    }),
    check('custodios_custodio_valido', sql`${t.custodio} is not null and ${textoRecortado(t.custodio, 150)}`),
    check('custodios_periodo_valido', sql`${t.hasta} is null or ${t.hasta} >= ${t.desde}`),
    check('custodios_motivo_valido', textoRecortado(t.motivoDelCambio, 300)),
    uniqueIndex('custodios_vigente_unico')
      .on(t.fondoId)
      .where(sql`${t.hasta} is null`),
    index('custodios_fondo_idx').on(t.fondoId, t.desde),
    index('custodios_usuario_idx')
      .on(t.custodioUsuarioId)
      .where(sql`${t.custodioUsuarioId} is not null`),
    politicaPorEmpresa(),
    politicaPorAlcance(ALCANCE_DE_FONDOS, 'fondo_id'),
  ],
);
