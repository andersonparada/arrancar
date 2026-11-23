import { sql } from 'drizzle-orm';
import { check, foreignKey, index, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { ROLES_DE_CUENTA, type RolDeCuenta } from '../../../core/contratos/contabilidad.contratos.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentas } from './cuentas.tablas.js';
import { esquemaContabilidad } from './esquema.tablas.js';

const roles = sql.raw(ROLES_DE_CUENTA.map((rol) => `'${rol}'`).join(', '));

/**
 * Qué cuenta cumple cada rol de sistema en la empresa (`docs/modulos/diseno-contabilidad.md` §5.3). La llave es el id
 * de un registro de otro módulo (o una regla de retención): no lleva llave foránea porque vive en módulos que
 * Contabilidad no necesita; `llave_nombre` guarda cómo se llamaba al enlazar. Sin llave, el enlace rige para todo el rol.
 */
export const enlaces = esquemaContabilidad.table(
  'enlaces',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    rol: text().$type<RolDeCuenta>().notNull(),
    llave: text(),
    llaveNombre: text(),
    cuentaId: uuid().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    uniqueIndex('enlaces_rol_llave_unico').on(t.empresaId, t.rol, sql`coalesce(${t.llave}, '')`),
    foreignKey({
      name: 'enlaces_cuenta_fk',
      columns: [t.cuentaId, t.empresaId],
      foreignColumns: [cuentas.id, cuentas.empresaId],
    }),
    index('enlaces_cuenta_idx').on(t.cuentaId),
    check('enlaces_rol_valido', sql`${t.rol} in (${roles})`),
    check('enlaces_llave_no_vacia', sql`${t.llave} is null or char_length(btrim(${t.llave})) > 0`),
    check('enlaces_nombre_con_llave', sql`(${t.llave} is null) = (${t.llaveNombre} is null)`),
    politicaPorEmpresa(),
  ],
);
