import { sql } from 'drizzle-orm';
import { check, jsonb, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from './core.esquema.js';
import { idPrimario } from '../base-datos/columnas.js';
import { cuentas } from './cuentas.esquema.js';
import { empresas } from './empresas.esquema.js';
import { usuarios } from './usuarios.esquema.js';

export const NIVELES_GUARDADOS = ['instalacion', 'cuenta', 'empresa'] as const;

/**
 * Valores de configuración fijados desde la aplicación. El nivel `instalacion`
 * lo edita soporte y aplica a todo el servidor; tiene prioridad sobre el archivo
 * de instalación. Los predeterminados viven en el código de cada módulo.
 */
export const configuraciones = esquemaCore.table(
  'configuraciones',
  {
    id: idPrimario(),
    nivel: text({ enum: NIVELES_GUARDADOS }).notNull(),
    cuentaId: uuid().references(() => cuentas.id, { onDelete: 'cascade' }),
    empresaId: uuid().references(() => empresas.id, { onDelete: 'cascade' }),
    clave: text().notNull(),
    valor: jsonb().notNull(),
    actualizadoPor: uuid().references(() => usuarios.id, { onDelete: 'set null' }),
    actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('configuraciones_por_instalacion')
      .on(t.clave)
      .where(sql`nivel = 'instalacion'`),
    uniqueIndex('configuraciones_por_cuenta')
      .on(t.cuentaId, t.clave)
      .where(sql`nivel = 'cuenta'`),
    uniqueIndex('configuraciones_por_empresa')
      .on(t.empresaId, t.clave)
      .where(sql`nivel = 'empresa'`),
    check(
      'configuraciones_nivel_coherente',
      sql`(nivel = 'instalacion' and cuenta_id is null and empresa_id is null)
        or (nivel = 'cuenta' and cuenta_id is not null and empresa_id is null)
        or (nivel = 'empresa' and cuenta_id is not null and empresa_id is not null)`,
    ),
  ],
);
