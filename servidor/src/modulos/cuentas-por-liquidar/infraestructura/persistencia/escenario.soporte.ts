/**
 * Piezas comunes de las pruebas de integración de Cuentas por liquidar: dos cuentas (A con dos empresas, B con una),
 * un usuario, un tercero beneficiario por cuenta, un proveedor, conceptos de gasto, documentos del libro de compras y
 * movimientos de Bancos (a lo que apuntan las llaves), y filas válidas de anticipos y gastos.
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
import { bancos } from '../../../bancos/infraestructura/persistencia/bancos.tablas.js';
import { conceptos } from '../../../bancos/infraestructura/persistencia/conceptos.tablas.js';
import { cuentasBancarias } from '../../../bancos/infraestructura/persistencia/cuentas-bancarias.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { tiposDeLocalidad } from '../../../empresas/infraestructura/persistencia/tipos-de-localidad.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { conceptosDeGasto } from '../../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';

export interface Escenario {
  usuarioId: string;
  cuentaA: string;
  cuentaB: string;
  empresaA1: string;
  empresaA2: string;
  empresaB: string;
  beneficiarioA: string;
  proveedorA: string;
  /** Un proveedor de la otra cuenta (B). */
  proveedorB: string;
  localidadA1: string;
  localidadA2: string;
  conceptoDeGastoA1: string;
  conceptoDeGastoA2: string;
  cuentaBancariaA1: string;
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

/** El nombre de la restricción (check, llave o único) que rechazó la operación. */
export const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

/** Corre una sentencia como dueño de la base (sin RLS): para lo que la aplicación no puede o no debe hacer. */
export async function comoPropietario(consulta: string, parametros: unknown[] = []) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return await conexion.query(consulta, parametros);
  } finally {
    await conexion.end();
  }
}

export const contextoDe = (escenario: Escenario, empresaId = escenario.empresaA1): ContextoEmpresa => ({
  empresaId,
  cuentaId: empresaId === escenario.empresaB ? escenario.cuentaB : escenario.cuentaA,
  usuarioId: escenario.usuarioId,
  recursosAlcanceTotal: ['empresas.localidades'],
});

async function crearEmpresas() {
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
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
  return { cuentaA: a!.id, cuentaB: b!.id, empresaA1, empresaA2, empresaB };
}

async function crearTercero(contexto: ContextoEmpresa, nombre: string): Promise<string> {
  const { cuentaId } = contexto;
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx.insert(terceros).values({ cuentaId, tipo: 'individual', nombres: nombre, nombreMostrar: nombre }).returning(),
  );
  return fila!.id;
}

async function crearProveedor(contexto: ContextoEmpresa): Promise<string> {
  const terceroId = await crearTercero(contexto, 'Proveedor de pruebas');
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx.insert(proveedores).values({ cuentaId: contexto.cuentaId, terceroId }).returning(),
  );
  return fila!.id;
}

async function crearLocalidad(contexto: ContextoEmpresa, codigo: string): Promise<string> {
  return enTransaccionSegura(contexto, async (tx) => {
    const { empresaId } = contexto;
    const [tipo] = await tx
      .insert(tiposDeLocalidad)
      .values({ empresaId, nombre: `Tipo ${codigo}` })
      .returning();
    const [localidad] = await tx
      .insert(localidades)
      .values({ empresaId, tipoId: tipo!.id, codigo, nombre: `Localidad ${codigo}` })
      .returning();
    return localidad!.id;
  });
}

async function crearConceptoDeGasto(contexto: ContextoEmpresa): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(conceptosDeGasto)
      .values({ empresaId: contexto.empresaId, nombre: 'Viáticos', tipoPorOmision: 'servicio' })
      .returning(),
  );
  return fila!.id;
}

async function crearCuentaBancaria(contexto: ContextoEmpresa): Promise<string> {
  const { empresaId } = contexto;
  return enTransaccionSegura(contexto, async (tx) => {
    const [banco] = await tx.insert(bancos).values({ empresaId, nombre: 'Banco de pruebas' }).returning();
    const [cuenta] = await tx
      .insert(cuentasBancarias)
      .values({
        empresaId,
        nombre: 'Cuenta de pruebas',
        bancoId: banco!.id,
        numero: '001',
        numeroNormalizado: '001',
        tipo: 'monetaria',
      })
      .returning();
    return cuenta!.id;
  });
}

/** Migra, vacía la base de pruebas y arma las cuentas, empresas, usuario y lo que las llaves necesitan. */
export async function prepararEscenario(): Promise<Escenario> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'ccliquidar', nombres: 'Liquidar', hashContrasena: 'x' })
    .returning();
  const base = { usuarioId: usuario!.id, ...(await crearEmpresas()) };
  const parcial = { ...base } as Escenario;
  const deA1 = contextoDe(parcial, base.empresaA1);
  const deA2 = contextoDe(parcial, base.empresaA2);
  return {
    ...base,
    beneficiarioA: await crearTercero(deA1, 'Beneficiario A'),
    proveedorA: await crearProveedor(deA1),
    proveedorB: await crearProveedor(contextoDe(parcial, base.empresaB)),
    localidadA1: await crearLocalidad(deA1, 'A1'),
    localidadA2: await crearLocalidad(deA2, 'A2'),
    conceptoDeGastoA1: await crearConceptoDeGasto(deA1),
    conceptoDeGastoA2: await crearConceptoDeGasto(deA2),
    cuentaBancariaA1: await crearCuentaBancaria(deA1),
  };
}

let secuencia = 0;
const siguiente = () => (secuencia += 1);

/** Una factura del libro de compras con destino Cuentas por liquidar (a la que apuntan los gastos). */
export async function crearDocumentoDeLibro(escenario: Escenario): Promise<string> {
  const [fila] = await enTransaccionSegura(contextoDe(escenario), (tx) =>
    tx
      .insert(documentos)
      .values({
        empresaId: escenario.empresaA1,
        tipo: 'factura',
        tipoDte: 'FACT',
        proveedorId: escenario.proveedorA,
        nitEmisor: '1234567',
        nombreEmisor: 'Proveedor',
        serie: 'A',
        numero: `CL${siguiente()}`,
        autorizacionFel: crypto.randomUUID(),
        fechaEmision: '2026-03-10',
        fechaRecepcion: '2026-03-10',
        periodo: '2026-03-01',
        destino: 'cuentas-por-liquidar',
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

/** Un cheque de Bancos de la empresa A1 (a lo que apuntan la entrega, la devolución y el reembolso). */
export async function crearMovimiento(escenario: Escenario): Promise<string> {
  const contexto = contextoDe(escenario);
  const [fila] = await enTransaccionSegura(contexto, async (tx) => {
    const [concepto] = await tx
      .insert(conceptos)
      .values({
        empresaId: contexto.empresaId,
        nombre: `Concepto ${siguiente()}`,
        aplicaA: 'ambos',
        actividadDeFlujo: 'operacion',
      })
      .returning();
    return tx
      .insert(movimientos)
      .values({
        empresaId: contexto.empresaId,
        cuentaBancariaId: escenario.cuentaBancariaA1,
        tipo: 'cheque',
        fecha: '2026-03-10',
        monto: '100',
        conceptoId: concepto!.id,
        referencia: `CH${siguiente()}`,
      })
      .returning();
  });
  return fila!.id;
}
