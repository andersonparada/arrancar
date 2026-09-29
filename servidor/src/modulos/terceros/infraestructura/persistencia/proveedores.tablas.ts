import { boolean, index, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { autoria, idPrimario, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
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
    ...autoria,
  },
  (t) => [
    uniqueIndex('categorias_proveedor_nombre_por_cuenta').on(t.cuentaId, nombreNormalizado(t.nombre)),
    politicaPorCuenta(),
  ],
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
    ...autoria,
  },
  (t) => [
    uniqueIndex('proveedores_tercero_idx').on(t.terceroId),
    /** Destino de la llave compuesta de otros módulos: garantiza que el proveedor es de la misma cuenta. */
    unique('proveedores_id_cuenta_unico').on(t.id, t.cuentaId),
    index('proveedores_categoria_idx').on(t.categoriaId),
    politicaPorCuenta(),
  ],
);
