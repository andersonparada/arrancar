/**
 * Piezas comunes de las pruebas de integración de Cuentas por pagar: dos cuentas (A con dos empresas, B con una), un
 * proveedor por cuenta, documentos de Libro de compras (las llaves los exigen) y valores válidos para los de aquí.
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
import { documentos as documentosDeCompras } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { documentos } from './documentos.tablas.js';

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

export async function crearProveedor(contexto: ContextoEmpresa, nombre: string): Promise<string> {
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

/** Migra, vacía la base de pruebas y arma las cuentas, empresas y proveedores. */
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
  const deA = { empresaId: empresaA1, cuentaId: base.cuentaA, usuarioId: base.usuarioId };
  const deB = { empresaId: empresaB, cuentaId: base.cuentaB, usuarioId: base.usuarioId };
  return {
    ...base,
    proveedorA: await crearProveedor(deA, 'Proveedor A'),
    proveedorA2: await crearProveedor(deA, 'Proveedor A2'),
    proveedorB: await crearProveedor(deB, 'Proveedor B'),
  };
}

export const contextoDe = (escenario: Escenario, empresaId: string, cuentaId: string): ContextoEmpresa => ({
  empresaId,
  cuentaId,
  usuarioId: escenario.usuarioId,
});

let secuencia = 0;

/** Una factura de Libro de compras (a la que apunta la de aquí); `destino` y proveedor se cambian para probar la llave. */
export async function crearDocumentoDeLibro(
  contexto: ContextoEmpresa,
  proveedorId: string,
  destino: 'cuentas-por-pagar' | 'caja-chica' = 'cuentas-por-pagar',
): Promise<string> {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(documentosDeCompras)
      .values({
        empresaId: contexto.empresaId,
        tipo: 'factura',
        tipoDte: 'FACT',
        proveedorId,
        nitEmisor: '1234567',
        nombreEmisor: 'Proveedor',
        serie: 'A',
        numero: `N${secuencia}`,
        autorizacionFel: crypto.randomUUID(),
        fechaEmision: '2026-03-10',
        fechaRecepcion: '2026-03-10',
        periodo: '2026-03-01',
        destino,
        regimenIvaDeLaEmpresa: 'general',
        total: '112',
        base: '100',
        iva: '12',
        ivaNoAcreditable: '0',
        idp: '0',
        exento: '0',
      })
      .returning(),
  );
  return fila!.id;
}

/** Una factura pendiente de Q112 sin retenciones ni vencimiento (los valores que cada caso cambia). */
export function documentoValido(
  escenario: Escenario,
  documentoId: string,
  cambios: Record<string, unknown> = {},
): typeof documentos.$inferInsert {
  return {
    empresaId: escenario.empresaA1,
    documentoId,
    tipo: 'factura',
    proveedorId: escenario.proveedorA,
    fechaEmision: '2026-03-10',
    total: '112',
    vencimiento: '2026-04-10',
    ...cambios,
  };
}
