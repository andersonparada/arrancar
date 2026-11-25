import { sql } from 'drizzle-orm';
import { boolean, check, foreignKey, index, text, uuid } from 'drizzle-orm/pg-core';
import { autoria, deLaTransaccion, marcasDeTiempo, politicaPorCuenta } from '../../../core/base-datos/columnas.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import {
  AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE,
  type AgenteDeRetencionDeIvaDeCliente,
} from '../../dominio/datos-fiscales-de-cliente.js';
import { esquemaLibroDeVentas } from './esquema.tablas.js';

const agentesEnSql = sql.raw(AGENTES_DE_RETENCION_DE_IVA_DE_CLIENTE.map((agente) => `'${agente}'`).join(', '));

/**
 * Lo fiscal de cada cliente que importa al vender (si retiene y qué): una fila por cliente, de la cuenta (vale para
 * todas sus empresas). Sin fila, el cliente no retiene nada. La llave compuesta `(cliente_id, cuenta_id)` apunta a
 * `terceros.clientes`, que garantiza que el cliente es de esa misma cuenta.
 */
export const datosFiscalesDeCliente = esquemaLibroDeVentas.table(
  'datos_fiscales_de_cliente',
  {
    clienteId: uuid().primaryKey(),
    cuentaId: uuid()
      .notNull()
      .default(deLaTransaccion.cuenta())
      .references(() => cuentas.id, { onDelete: 'cascade' }),
    agenteDeRetencionIva: text().$type<AgenteDeRetencionDeIvaDeCliente>().notNull().default('ninguno'),
    exportaProductosAgropecuarios: boolean().notNull().default(false),
    retieneIsr: boolean().notNull().default(false),
    retieneIvaAPequenoContribuyente: boolean().notNull().default(false),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'datos_fiscales_de_cliente_cliente_fk',
      columns: [t.clienteId, t.cuentaId],
      foreignColumns: [clientes.id, clientes.cuentaId],
    }).onDelete('cascade'),
    index('datos_fiscales_de_cliente_cuenta_idx').on(t.cuentaId),
    check('datos_fiscales_de_cliente_agente', sql`${t.agenteDeRetencionIva} in (${agentesEnSql})`),
    check(
      'datos_fiscales_de_cliente_exportador',
      sql`${t.agenteDeRetencionIva} = 'exportador' or not ${t.exportaProductosAgropecuarios}`,
    ),
    check(
      'datos_fiscales_de_cliente_iva_a_pequeno',
      sql`${t.agenteDeRetencionIva} <> 'ninguno' or not ${t.retieneIvaAPequenoContribuyente}`,
    ),
    politicaPorCuenta(),
  ],
);
