import { sql } from 'drizzle-orm';
import { date, foreignKey, index, integer, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { restriccionesDeContrasena } from './contrasenas.restricciones.js';
import { esquemaCuentasPorPagar } from './esquema.tablas.js';

/**
 * Contraseña de pago: agrupa documentos de un proveedor con la fecha de pago prometida. No guarda montos (se calculan
 * con los saldos de sus documentos). Nunca se elimina, para no perder el correlativo: se anula. Sus documentos viven en
 * `contrasena_documentos`.
 */
export const contrasenas = esquemaCuentasPorPagar.table(
  'contrasenas',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    proveedorId: uuid().notNull(),
    /** Del correlativo `cuentas-por-pagar.contrasenas`. */
    numero: integer().notNull(),
    /** El año del número si la empresa reinicia sus correlativos cada año; 0 si no. */
    anioDeNumero: integer().notNull().default(0),
    /** Día en que se recibe y se entrega; no se cambia (tiene valor de prueba). */
    fecha: date().notNull(),
    /** La fecha de pago que se le promete al proveedor. */
    fechaDePago: date().notNull(),
    observaciones: text(),
    estado: text().notNull().default('vigente'),
    anuladaEn: timestamp({ withTimezone: true }),
    anuladaPor: uuid(),
    motivoDeAnulacion: text(),
    /** Primera impresión; desde la segunda la hoja dice «REIMPRESIÓN». No se vuelve a cambiar. */
    impresaEn: timestamp({ withTimezone: true }),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'contrasenas_proveedor_fk',
      columns: [t.proveedorId],
      foreignColumns: [proveedores.id],
    }),
    ...restriccionesDeContrasena(t),
    unique('contrasenas_numero_unico').on(t.empresaId, t.anioDeNumero, t.numero),
    unique('contrasenas_id_proveedor_unico').on(t.id, t.empresaId, t.proveedorId),
    index('contrasenas_proveedor_idx').on(t.proveedorId),
    index('contrasenas_lista_idx').on(t.empresaId, t.estado, t.fecha),
    index('contrasenas_pago_idx')
      .on(t.empresaId, t.fechaDePago)
      .where(sql`${t.estado} = 'vigente'`),
    politicaPorEmpresa(),
  ],
);
