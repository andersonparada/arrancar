import { sql } from 'drizzle-orm';
import { check, foreignKey, numeric, text, unique, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { esquemaBancos } from './esquema.tablas.js';

/**
 * La cabecera del saldo inicial de una cuenta bancaria (una por cuenta): ancla sus partidas de apertura
 * (`movimientos.saldo_inicial_id`) y guarda lo que el usuario transcribe solo para comparar: el saldo de la cuenta
 * contable en los libros del sistema anterior. El monto y la fecha del saldo del banco viven en su movimiento.
 */
export const saldosIniciales = esquemaBancos.table(
  'saldos_iniciales',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    cuentaBancariaId: uuid().notNull(),
    /** Solo para comparar con el saldo en libros al corte (puede ser negativo); nulo = sin dato. */
    saldoSegunLibrosAnteriores: numeric({ precision: 14, scale: 2 }),
    observaciones: text(),
    /** Último estado de cuenta o conciliación del sistema anterior (opcional). Lo pone siempre el servidor. */
    evidenciaArchivoId: uuid(),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [
    foreignKey({
      name: 'saldos_iniciales_cuenta_fk',
      columns: [t.cuentaBancariaId],
      foreignColumns: [cuentasBancarias.id],
    }),
    foreignKey({
      name: 'saldos_iniciales_evidencia_fk',
      columns: [t.evidenciaArchivoId],
      foreignColumns: [archivos.id],
    }),
    unique('saldos_iniciales_cuenta_unico').on(t.cuentaBancariaId),
    unique('saldos_iniciales_evidencia_unica').on(t.evidenciaArchivoId),
    check(
      'saldos_iniciales_observaciones_validas',
      sql`${t.observaciones} is null or (length(${t.observaciones}) between 1 and 500 and ${t.observaciones} = btrim(${t.observaciones}))`,
    ),
    politicaPorEmpresa(),
  ],
);
