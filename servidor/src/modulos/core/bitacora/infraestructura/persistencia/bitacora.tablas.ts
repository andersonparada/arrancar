import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { esquemaCore } from '../../../esquemas/core.esquema.js';
import { idPrimario } from '../../../base-datos/columnas.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { empresas } from '../../../esquemas/empresas.esquema.js';

/** Registro de las entradas de soporte (superacceso) a empresas ajenas. */
export const bitacoraSuperacceso = esquemaCore.table(
  'bitacora_superacceso',
  {
    id: idPrimario(),
    usuarioId: uuid()
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    empresaId: uuid().references(() => empresas.id, { onDelete: 'set null' }),
    accion: text().notNull(),
    detalle: jsonb(),
    direccionIp: text(),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('bitacora_superacceso_fecha_idx').on(t.creadoEn)],
);
