/**
 * Piezas comunes de las pruebas de integración de documentos y líneas de venta: dos cuentas, tres empresas, un cliente
 * y un concepto por cuenta (en variables que se llenan en `prepararBase`) y valores válidos que cada prueba cambia.
 */
import { sql } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import { documentos } from './documentos.tablas.js';
import type { lineasDeDocumento } from './lineas-de-documento.tablas.js';

export let usuarioId: string;
export let cuentaA: string;
export let cuentaB: string;
export let empresaA1: string;
export let empresaA2: string;
export let empresaB: string;
export let clienteDeA: string;
export let clienteDeB: string;
export let conceptoDeA1: string;
export let conceptoDeA2: string;

export const en = (empresaId: string, cuentaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });
export const enA1 = () => en(empresaA1, cuentaA);

/** La restricción que rechazó la operación: Drizzle envuelve el error de PostgreSQL en sus causas. */
export async function restriccionQueViola(operacion: Promise<unknown>): Promise<string | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual.constraint;
    }
  }
  return undefined;
}

async function crearClienteEn(cuentaId: string, empresaId: string): Promise<string> {
  return enTransaccionSegura(en(empresaId, cuentaId), async (tx) => {
    const [tercero] = await tx
      .insert(terceros)
      .values({ cuentaId, tipo: 'juridica', razonSocial: 'Cliente', nombreMostrar: 'Cliente' })
      .returning();
    const [cliente] = await tx
      .insert(clientes)
      .values({ cuentaId, terceroId: tercero!.id, clase: 'directo' })
      .returning();
    return cliente!.id;
  });
}

async function crearConcepto(empresaId: string, cuentaId: string): Promise<string> {
  const [fila] = await enTransaccionSegura(en(empresaId, cuentaId), (tx) =>
    tx.insert(conceptosDeIngreso).values({ empresaId, nombre: 'Venta', tipo: 'bien' }).returning(),
  );
  return fila!.id;
}

/** Migra la base de pruebas y la deja con dos cuentas, tres empresas, un cliente y un concepto por cuenta. */
export async function prepararBase(): Promise<void> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await bdPropietario.execute(sql`truncate core.cuentas, core.usuarios cascade`);
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'ventaslvdos', nombres: 'Ventas', hashContrasena: 'x' })
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa A1' },
      { cuentaId: a!.id, nombre: 'Empresa A2' },
      { cuentaId: b!.id, nombre: 'Empresa B' },
    ])
    .returning();
  usuarioId = usuario!.id;
  [cuentaA, cuentaB] = [a!.id, b!.id];
  [empresaA1, empresaA2, empresaB] = filas.map((fila) => fila.id) as [string, string, string];
  clienteDeA = await crearClienteEn(cuentaA, empresaA1);
  clienteDeB = await crearClienteEn(cuentaB, empresaB);
  conceptoDeA1 = await crearConcepto(empresaA1, cuentaA);
  conceptoDeA2 = await crearConcepto(empresaA2, cuentaA);
}

/** Cierra las conexiones de la prueba. */
export async function cerrarBase(): Promise<void> {
  await grupoConexiones.end();
}

let consecutivo = 0;

/** Un documento válido (factura general de Q112.00 con IVA); cada prueba cambia lo que quiere romper. */
export const documento = (cambios: Partial<typeof documentos.$inferInsert> = {}): typeof documentos.$inferInsert => {
  consecutivo += 1;
  return {
    empresaId: empresaA1,
    tipo: 'factura',
    clienteId: clienteDeA,
    tipoDeIdentificacion: 'nit',
    nitReceptor: '576937K',
    nombreReceptor: 'Cliente',
    numero: String(consecutivo),
    fechaEmision: '2026-03-15',
    periodo: '2026-03-01',
    regimenIvaDeLaEmpresa: 'general',
    totalEnMoneda: '112.00',
    total: '112.00',
    gravadoBienes: '100.00',
    gravadoServicios: '0.00',
    exento: '0.00',
    exportacion: '0.00',
    iva: '12.00',
    ...cambios,
  };
};

export const insertar = (valores: typeof documentos.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(documentos).values(valores).returning());

export const linea = (documentoId: string, cambios: Partial<typeof lineasDeDocumento.$inferInsert> = {}) => ({
  empresaId: empresaA1,
  documentoId,
  orden: 1,
  conceptoDeIngresoId: conceptoDeA1,
  tipo: 'bien' as const,
  claseFiscal: 'gravada' as const,
  total: '112.00',
  base: '100.00',
  iva: '12.00',
  ...cambios,
});
