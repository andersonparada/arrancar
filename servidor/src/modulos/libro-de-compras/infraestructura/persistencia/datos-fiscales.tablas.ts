import { sql } from 'drizzle-orm';
import { boolean, check, date, foreignKey, index, text, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  autoria,
  deLaTransaccion,
  idPrimario,
  marcasDeTiempo,
  politicaPorCuenta,
  politicaPorEmpresa,
} from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { esquemaLibroDeCompras } from './esquema.tablas.js';

const REGIMENES_DE_IVA_SQL = `'general', 'pequeno_contribuyente', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario', 'primario_pecuario', 'no_afiliado'`;

type ColumnasDeLaEmpresa = Record<
  'regimenIva' | 'regimenIsr' | 'agenteDeRetencionIva' | 'tipoDePersona' | 'vigenteDesde',
  AnyPgColumn
>;

/** Las reglas de coherencia de los regímenes y el agente de IVA (las mismas del dominio). */
function reglasDeLosRegimenes(t: ColumnasDeLaEmpresa) {
  return [
    check('datos_fiscales_de_empresa_regimen_iva', sql`${t.regimenIva} in (${sql.raw(REGIMENES_DE_IVA_SQL)})`),
    check(
      'datos_fiscales_de_empresa_regimen_isr',
      sql`${t.regimenIsr} is null or ${t.regimenIsr} in ('utilidades', 'opcional_simplificado', 'exento')`,
    ),
    check(
      'datos_fiscales_de_empresa_regimen_isr_segun_iva',
      sql`(${t.regimenIva} in ('general', 'no_afiliado')) = (${t.regimenIsr} is not null)`,
    ),
    check(
      'datos_fiscales_de_empresa_agente_de_iva',
      sql`${t.agenteDeRetencionIva} in ('ninguno', 'exportador', 'contribuyente_especial', 'sector_publico', 'otro')`,
    ),
    check(
      'datos_fiscales_de_empresa_agente_de_iva_solo_general',
      sql`${t.regimenIva} = 'general' or ${t.agenteDeRetencionIva} = 'ninguno'`,
    ),
  ];
}

/** Las reglas del tipo de persona y de la fecha de vigencia (las mismas del dominio). */
function reglasDePersonaYVigencia(t: ColumnasDeLaEmpresa) {
  return [
    check('datos_fiscales_de_empresa_tipo_de_persona', sql`${t.tipoDePersona} in ('individual', 'juridica')`),
    check(
      'datos_fiscales_de_empresa_agropecuario_individual',
      sql`${t.regimenIva} <> 'contribuyente_agropecuario' or ${t.tipoDePersona} = 'individual'`,
    ),
    check(
      'datos_fiscales_de_empresa_exento_solo_juridica',
      sql`${t.regimenIsr} is distinct from 'exento' or ${t.tipoDePersona} = 'juridica'`,
    ),
    check(
      'datos_fiscales_de_empresa_vigente_desde_primer_dia',
      sql`${t.vigenteDesde} is null or extract(day from ${t.vigenteDesde}) = 1`,
    ),
  ];
}

/**
 * Historial fiscal de cada empresa: una fila por vigencia (escalón). Cada fila rige desde `vigente_desde` hasta el
 * mes anterior al de la siguiente; la base tiene `vigente_desde` nulo («desde el inicio»). El tipo de persona vive
 * en cada fila y el dominio lo mantiene igual en todas. Sin filas la empresa no tiene datos fiscales: no se supone
 * ningún régimen. El NIT sigue en `core.empresas`, y la razón social y el nombre comercial en
 * `empresas.datos_fiscales`.
 */
export const datosFiscalesDeEmpresa = esquemaLibroDeCompras.table(
  'datos_fiscales_de_empresa',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    vigenteDesde: date(),
    tipoDePersona: text().notNull(),
    regimenIva: text().notNull().default('general'),
    regimenIsr: text().default('utilidades'),
    agenteDeRetencionIva: text().notNull().default('ninguno'),
    esAgenteDeRetencionIsr: boolean().notNull().default(true),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    unique('datos_fiscales_de_empresa_vigencia_unica').on(t.empresaId, t.vigenteDesde).nullsNotDistinct(),
    ...reglasDeLosRegimenes(t),
    ...reglasDePersonaYVigencia(t),
    politicaPorEmpresa(),
  ],
);

type ColumnasDelProveedor = Record<
  | 'regimenIva'
  | 'regimenIsr'
  | 'esAgenteDeRetencionIva'
  | 'seLeRetieneIva'
  | 'seLeRetieneIsr'
  | 'seLeRetieneIvaPequenoContribuyente',
  AnyPgColumn
>;

const REGIMENES_DE_IVA = `'general', 'pequeno_contribuyente', 'primario', 'pecuario', 'sin_inscripcion', 'no_domiciliado', 'pequeno_contribuyente_electronico', 'contribuyente_agropecuario'`;

/** Las reglas del régimen del proveedor (las mismas del dominio). */
function reglasDelRegimen(t: ColumnasDelProveedor) {
  return [
    check('datos_fiscales_de_proveedor_regimen_iva_valido', sql`${t.regimenIva} in (${sql.raw(REGIMENES_DE_IVA)})`),
    check(
      'datos_fiscales_de_proveedor_regimen_isr_valido',
      sql`${t.regimenIsr} is null or ${t.regimenIsr} in ('utilidades', 'opcional_simplificado', 'no_domiciliado', 'exento')`,
    ),
    check(
      'datos_fiscales_de_proveedor_regimen_isr',
      sql`(${t.regimenIva} in ('general', 'no_domiciliado')) = (${t.regimenIsr} is not null)`,
    ),
    check(
      'datos_fiscales_de_proveedor_no_domiciliado',
      sql`(${t.regimenIva} = 'no_domiciliado') = (${t.regimenIsr} is not distinct from 'no_domiciliado')`,
    ),
    check(
      'datos_fiscales_de_proveedor_agente_solo_general',
      sql`${t.regimenIva} = 'general' or not ${t.esAgenteDeRetencionIva}`,
    ),
  ];
}

/** Las reglas de a quién se le retiene (las mismas del dominio). */
function reglasDeRetencion(t: ColumnasDelProveedor) {
  return [
    check(
      'datos_fiscales_de_proveedor_retencion_iva_pequeno',
      sql`${t.regimenIva} = 'pequeno_contribuyente' or not ${t.seLeRetieneIvaPequenoContribuyente}`,
    ),
    check(
      'datos_fiscales_de_proveedor_retencion_iva_general',
      sql`${t.regimenIva} = 'general' or not ${t.seLeRetieneIva}`,
    ),
    check('datos_fiscales_de_proveedor_retencion_isr', sql`${t.regimenIsr} is not null or not ${t.seLeRetieneIsr}`),
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
    regimenIva: text().notNull().default('general'),
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
