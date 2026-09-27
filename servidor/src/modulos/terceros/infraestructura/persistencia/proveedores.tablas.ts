import { boolean, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/esquemas/cuentas.esquema.js';
import { esquemaTerceros, terceros } from './terceros.tablas.js';

/** Categoría de proveedor, editable por cuenta (insumos, veterinario, transporte...). */
export const categoriasProveedor = esquemaTerceros.table(
  'categorias_proveedor',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    activo: boolean().notNull().default(true),
    ...marcasDeTiempo,
  },
  (t) => [unique('categorias_proveedor_nombre_por_cuenta').on(t.cuentaId, t.nombre), politicaPorCuenta()],
);

/** Papel de proveedor de un tercero; cada tercero tiene a lo sumo uno. */
export const proveedores = esquemaTerceros.table(
  'proveedores',
  {
    id: idPrimario(),
    cuentaId: uuid()
      .notNull()
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    terceroId: uuid()
      .notNull()
      .references(() => terceros.id, { onDelete: 'cascade' }),
    categoriaId: uuid().references(() => categoriasProveedor.id, { onDelete: 'set null' }),
    activo: boolean().notNull().default(true),
    notas: text(),
    ...marcasDeTiempo,
  },
  (t) => [
    uniqueIndex('proveedores_tercero_idx').on(t.terceroId),
    index('proveedores_categoria_idx').on(t.categoriaId),
    politicaPorCuenta(),
  ],
);
