import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  marcasDeTiempo,
  politicaPorCuenta,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

/**
 * Datos fiscales de cada empresa: regímenes y agentes de retención (una fila por empresa, creada al guardar la
 * sección por primera vez; sin fila valen los valores por omisión). El NIT sigue en `core.empresas`, y la razón
 * social y el nombre comercial en `empresas.datos_fiscales`.
 */
export const datosFiscalesDeEmpresa = esquemaLibroDeCompras.table(
  'datos_fiscales_de_empresa',
  {
    empresaId: uuid()
      .primaryKey()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    regimenIva: text().notNull().default('general'),
    regimenIsr: text().notNull().default('utilidades'),
    agenteDeRetencionIva: text().notNull().default('ninguno'),
    esAgenteDeRetencionIsr: boolean().notNull().default(false),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    check('datos_fiscales_de_empresa_regimen_iva', sql`${t.regimenIva} in ('general', 'pequeno_contribuyente')`),
    check('datos_fiscales_de_empresa_regimen_isr', sql`${t.regimenIsr} in ('utilidades', 'opcional_simplificado')`),
    check(
      'datos_fiscales_de_empresa_agente_de_iva',
      sql`${t.agenteDeRetencionIva} in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')`,
    ),
    check(
      'datos_fiscales_de_empresa_pequeno_no_retiene',
      sql`${t.regimenIva} <> 'pequeno_contribuyente' or ${t.agenteDeRetencionIva} = 'ninguno'`,
    ),
    politicaPorEmpresa(),
  ],
);

type ColumnasDelProveedor = Record<
  | 'esPequenoContribuyente'
  | 'regimenIsr'
  | 'esAgenteDeRetencionIva'
  | 'seLeRetieneIva'
  | 'seLeRetieneIsr'
  | 'seLeRetieneIvaPequenoContribuyente',
  AnyPgColumn
>;

/** Las reglas del régimen del proveedor (las mismas del dominio). */
function reglasDelRegimen(t: ColumnasDelProveedor) {
  return [
    check(
      'datos_fiscales_de_proveedor_regimen_isr_valido',
      sql`${t.regimenIsr} is null or ${t.regimenIsr} in ('utilidades', 'opcional_simplificado', 'no_domiciliado')`,
    ),
    check(
      'datos_fiscales_de_proveedor_regimen_isr',
      sql`(${t.esPequenoContribuyente} and ${t.regimenIsr} is null) or (not ${t.esPequenoContribuyente} and ${t.regimenIsr} is not null)`,
    ),
    check(
      'datos_fiscales_de_proveedor_pequeno_no_es_agente',
      sql`not (${t.esPequenoContribuyente} and ${t.esAgenteDeRetencionIva})`,
    ),
  ];
}

/** Las reglas de a quién se le retiene (las mismas del dominio). */
function reglasDeRetencion(t: ColumnasDelProveedor) {
  return [
    check(
      'datos_fiscales_de_proveedor_retencion_iva_pequeno',
      sql`not ${t.seLeRetieneIvaPequenoContribuyente} or ${t.esPequenoContribuyente}`,
    ),
    check(
      'datos_fiscales_de_proveedor_retencion_iva_general',
      sql`not (${t.seLeRetieneIva} and ${t.esPequenoContribuyente})`,
    ),
    check('datos_fiscales_de_proveedor_retencion_isr', sql`not (${t.seLeRetieneIsr} and ${t.esPequenoContribuyente})`),
  ];
}

/**
 * Datos fiscales de cada proveedor, compartidos por todas las empresas de la cuenta (el régimen es del
 * proveedor, no de quien le compra). La cuenta la fija la transacción y la llave compuesta hacia
 * `terceros.proveedores` garantiza que el proveedor es de esa misma cuenta.
 */
export const datosFiscalesDeProveedor = esquemaLibroDeCompras.table(
  'datos_fiscales_de_proveedor',
  {
    proveedorId: uuid().primaryKey(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    esPequenoContribuyente: boolean().notNull().default(false),
    regimenIsr: text(),
    esAgenteDeRetencionIva: boolean().notNull().default(false),
    seLeRetieneIva: boolean().notNull(),
    seLeRetieneIsr: boolean().notNull(),
    seLeRetieneIvaPequenoContribuyente: boolean().notNull(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'datos_fiscales_de_proveedor_proveedor_fk',
      columns: [t.proveedorId, t.cuentaId],
      foreignColumns: [proveedores.id, proveedores.cuentaId],
    }).onDelete('cascade'),
    index('datos_fiscales_de_proveedor_cuenta_idx').on(t.cuentaId),
    ...reglasDelRegimen(t),
    ...reglasDeRetencion(t),
    politicaPorCuenta(),
  ],
);
