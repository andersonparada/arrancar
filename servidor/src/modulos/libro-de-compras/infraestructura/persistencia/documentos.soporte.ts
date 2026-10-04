/**
 * Piezas comunes de las pruebas de integración de documentos, líneas y retenciones: el escenario (dos cuentas,
 * tres empresas, proveedores, conceptos y una vigencia de combustible) y valores válidos que cada prueba cambia.
 */
import pg, { DatabaseError } from 'pg';
import { configuracion } from '../../../../configuracion.js';
import { bd } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { combustibles } from './combustibles.tablas.js';
import { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';
import { documentos } from './documentos.tablas.js';
import type { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

export interface Escenario {
  usuarioId: string;
  cuentaA: string;
  cuentaB: string;
  empresaA1: string;
  empresaA2: string;
  empresaB: string;
  proveedorA: string;
  proveedorA2: string;
  proveedorB: string;
  conceptoA1: string;
  conceptoA2: string;
  vigenciaA1: string;
  vigenciaA2: string;
}

/** El error de PostgreSQL de la causa: Drizzle envuelve el original en sus propias excepciones. */
export async function errorDePostgres(operacion: Promise<unknown>): Promise<DatabaseError | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual;
    }
  }
  return undefined;
}

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

async function crearProveedor(contexto: ContextoEmpresa, nombre: string): Promise<string> {
  return enTransaccionSegura(contexto, async (tx) => {
    const { cuentaId } = contexto;
    const [tercero] = await tx
      .insert(terceros)
      .values({ cuentaId, tipo: 'juridica', razonSocial: nombre, nombreMostrar: nombre })
      .returning();
    const [proveedor] = await tx.insert(proveedores).values({ cuentaId, terceroId: tercero!.id }).returning();
    return proveedor!.id;
  });
}

async function crearConcepto(contexto: ContextoEmpresa): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(conceptosDeGasto)
      .values({ empresaId: contexto.empresaId, nombre: 'Concepto', tipoPorOmision: 'bien' })
      .returning(),
  );
  return fila!.id;
}

async function crearVigencia(contexto: ContextoEmpresa): Promise<string> {
  return enTransaccionSegura(contexto, async (tx) => {
    const { empresaId } = contexto;
    const [combustible] = await tx.insert(combustibles).values({ empresaId, nombre: 'Gasolina' }).returning();
    const [vigencia] = await tx
      .insert(vigenciasDeCombustible)
      .values({ empresaId, combustibleId: combustible!.id, idpPorGalon: '4.70', vigenteDesde: '2026-01-01' })
      .returning();
    return vigencia!.id;
  });
}

/** Migra, vacía la base de pruebas y arma dos cuentas (A con dos empresas, B con una) con lo mínimo para documentos. */
export async function prepararEscenario(nombreDeUsuario: string): Promise<Escenario> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: nombreDeUsuario, nombres: nombreDeUsuario, hashContrasena: 'x' })
    .returning();
  const filas = await bd
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa A1' },
      { cuentaId: a!.id, nombre: 'Empresa A2' },
      { cuentaId: b!.id, nombre: 'Empresa B' },
    ])
    .returning();
  const [empresaA1, empresaA2, empresaB] = filas.map((fila) => fila.id) as [string, string, string];
  const base = { usuarioId: usuario!.id, cuentaA: a!.id, cuentaB: b!.id, empresaA1, empresaA2, empresaB };
  const contexto = (empresaId: string, cuentaId: string) => ({ empresaId, cuentaId, usuarioId: base.usuarioId });
  const deA1 = contexto(empresaA1, base.cuentaA);
  const deA2 = contexto(empresaA2, base.cuentaA);
  return {
    ...base,
    proveedorA: await crearProveedor(deA1, 'Proveedor A'),
    proveedorA2: await crearProveedor(deA1, 'Proveedor A2'),
    proveedorB: await crearProveedor(contexto(empresaB, base.cuentaB), 'Proveedor B'),
    conceptoA1: await crearConcepto(deA1),
    conceptoA2: await crearConcepto(deA2),
    vigenciaA1: await crearVigencia(deA1),
    vigenciaA2: await crearVigencia(deA2),
  };
}

let secuencia = 0;

/** Una factura SAT válida (régimen general, Q112 con IVA) con número y autorización propios; se cambia lo que cada caso necesite. */
export function documentoValido(escenario: Escenario, cambios: Record<string, unknown> = {}) {
  secuencia += 1;
  return {
    empresaId: escenario.empresaA1,
    tipo: 'factura',
    proveedorId: escenario.proveedorA,
    nitEmisor: '1234567',
    nombreEmisor: 'Proveedor A',
    serie: 'A',
    numero: `N${secuencia}`,
    autorizacionFel: crypto.randomUUID(),
    fechaEmision: '2026-03-10',
    fechaRecepcion: '2026-03-10',
    periodo: '2026-03-01',
    destino: 'cuentas-por-pagar',
    total: '112',
    base: '100',
    iva: '12',
    ivaNoAcreditable: '0',
    idp: '0',
    exento: '0',
    ...cambios,
  } as typeof documentos.$inferInsert;
}

/** Una línea válida de Q112 con IVA, sin combustible. */
export function lineaValida(escenario: Escenario, documentoId: string, cambios: Record<string, unknown> = {}) {
  return {
    empresaId: escenario.empresaA1,
    documentoId,
    numero: 1,
    conceptoId: escenario.conceptoA1,
    tipo: 'bien',
    total: '112',
    base: '100',
    iva: '12',
    ivaNoAcreditable: '0',
    idp: '0',
    exento: '0',
    ...cambios,
  } as typeof lineasDeDocumento.$inferInsert;
}

export const contextoDe = (escenario: Escenario, empresaId: string, cuentaId: string): ContextoEmpresa => ({
  empresaId,
  cuentaId,
  usuarioId: escenario.usuarioId,
});

/** Inserta un documento (por omisión en la empresa A1) y devuelve su id. */
export async function insertarDocumento(
  valores: typeof documentos.$inferInsert,
  contexto: ContextoEmpresa,
): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) => tx.insert(documentos).values(valores).returning());
  return fila!.id;
}
