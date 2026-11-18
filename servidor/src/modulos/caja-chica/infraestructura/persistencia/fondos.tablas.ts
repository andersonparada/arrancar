import { sql } from 'drizzle-orm';
import { date, foreignKey, index, numeric, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { politicasDelRegistroConAlcance } from '../../../core/base-datos/alcance.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { ALCANCE_DE_FONDOS } from './alcance-de-fondos.js';
import { esquemaCajaChica } from './esquema.tablas.js';
import { restriccionesDeCierreDelFondo, restriccionesDeLosDatosDelFondo } from './fondos.restricciones.js';

/**
 * Un fondo fijo de caja chica: efectivo a cargo de un custodio para gastos menores. Su `id` es el documento de origen
 * de los movimientos de Bancos de la apertura, los aumentos, las disminuciones y el cierre. El monto no se guarda:
 * sale de `cambios_de_monto`; el custodio vigente, de `custodios_de_fondos`. Cada usuario ve y opera solo los fondos
 * que tiene asignados (`caja_chica.accesos_a_fondos`) o todos si tiene alcance total. No se borra: se cierra.
 */
export const fondos = esquemaCajaChica.table(
  'fondos',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    nombre: text().notNull(),
    /** Informativa: dónde está el fondo. No da ni quita acceso. */
    localidadId: uuid(),
    /** Nulo: se usa el de la empresa (`caja-chica.comprobantes.tope_por_omision`). */
    topePorComprobante: numeric({ precision: 14, scale: 2 }),
    /** La cuenta que se propone para reponer y depositar. */
    cuentaBancariaId: uuid().references(() => cuentasBancarias.id),
    origen: text().$type<'banco' | 'saldo_inicial'>().notNull().default('banco'),
    fechaDeApertura: date().notNull(),
    estado: text().$type<'abierto' | 'cerrado'>().notNull().default('abierto'),
    fechaDeCierre: date(),
    cerradoEn: timestamp({ withTimezone: true }),
    cerradoPor: uuid(),
    motivoDeCierre: text(),
    observaciones: text(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'fondos_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    ...restriccionesDeLosDatosDelFondo(t),
    ...restriccionesDeCierreDelFondo(t),
    uniqueIndex('fondos_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
    // Destino de las llaves compuestas de todo lo que apunta a un fondo.
    unique('fondos_id_empresa_unico').on(t.id, t.empresaId),
    index('fondos_lista_idx').on(t.empresaId, t.estado),
    index('fondos_localidad_idx')
      .on(t.localidadId)
      .where(sql`${t.localidadId} is not null`),
    index('fondos_cuenta_bancaria_idx')
      .on(t.cuentaBancariaId)
      .where(sql`${t.cuentaBancariaId} is not null`),
    politicaPorEmpresa(),
    ...politicasDelRegistroConAlcance(ALCANCE_DE_FONDOS),
  ],
);
