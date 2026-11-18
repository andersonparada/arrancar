/**
 * Piezas comunes de las pruebas de integración de Caja chica: dos cuentas (A con dos empresas, B con una), tres
 * usuarios (el que opera, un custodio y otro sin fondos), proveedores, localidades, conceptos de gasto, documentos del
 * libro de compras, movimientos de Bancos (a lo que apuntan las llaves) y valores válidos de un fondo.
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
  custodioId: string;
  otroId: string;
  cuentaA: string;
  cuentaB: string;
  empresaA1: string;
  empresaA2: string;
  empresaB: string;
  proveedorA: string;
  localidadA1: string;
  localidadA2: string;
  conceptoDeGastoA1: string;
  conceptoDeGastoA2: string;
  cuentaBancariaA1: string;
}

/** El recurso con alcance: el usuario que lo lleva ve todos los fondos de la empresa. */
export const RECURSO_DE_FONDOS = 'caja-chica.fondos';

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

/** Corre sentencias como dueño de la base (sin RLS): para lo que la aplicación no puede o no debe hacer. */
export async function comoPropietario<T = unknown>(consulta: string, parametros: unknown[] = []) {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return await conexion.query<T & pg.QueryResultRow>(consulta, parametros);
  } finally {
    await conexion.end();
  }
}

/** El contexto de un usuario en una empresa, con alcance total sobre los fondos (ve todos). */
export const contextoDe = (
  escenario: Escenario,
  empresaId = escenario.empresaA1,
  usuarioId = escenario.usuarioId,
): ContextoEmpresa => ({
  empresaId,
  cuentaId: empresaId === escenario.empresaB ? escenario.cuentaB : escenario.cuentaA,
  usuarioId,
  recursosAlcanceTotal: [RECURSO_DE_FONDOS],
});

/** El contexto de un usuario que solo ve los fondos que tiene asignados. */
export const contextoSinAlcance = (
  escenario: Escenario,
  usuarioId: string,
  empresaId = escenario.empresaA1,
): ContextoEmpresa => ({ ...contextoDe(escenario, empresaId, usuarioId), recursosAlcanceTotal: [] });

async function crearUsuarios(): Promise<[string, string, string]> {
  const filas = await bd
    .insert(usuarios)
    .values(['operador', 'custodio', 'otro'].map((n) => ({ usuario: `cc${n}`, nombres: n, hashContrasena: 'x' })))
    .returning();
  return filas.map((fila) => fila.id) as [string, string, string];
}

async function crearEmpresas(): Promise<{ cuentaA: string; cuentaB: string; ids: [string, string, string] }> {
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
  return { cuentaA: a!.id, cuentaB: b!.id, ids: filas.map((fila) => fila.id) as [string, string, string] };
}

async function crearLocalidad(contexto: ContextoEmpresa, codigo: string): Promise<string> {
  const conAlcance = { ...contexto, recursosAlcanceTotal: ['empresas.localidades'] };
  return enTransaccionSegura(conAlcance, async (tx) => {
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
      .values({ empresaId: contexto.empresaId, nombre: 'Papelería', tipoPorOmision: 'bien' })
      .returning(),
  );
  return fila!.id;
}

async function crearProveedor(contexto: ContextoEmpresa): Promise<string> {
  return enTransaccionSegura(contexto, async (tx) => {
    const { cuentaId } = contexto;
    const nombre = 'Proveedor de pruebas';
    const [tercero] = await tx
      .insert(terceros)
      .values({ cuentaId, tipo: 'juridica', razonSocial: nombre, nombreMostrar: nombre })
      .returning();
    const [proveedor] = await tx.insert(proveedores).values({ cuentaId, terceroId: tercero!.id }).returning();
    return proveedor!.id;
  });
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

/** Migra, vacía la base de pruebas y arma las cuentas, empresas, usuarios y lo que las llaves necesitan. */
export async function prepararEscenario(): Promise<Escenario> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [usuarioId, custodioId, otroId] = await crearUsuarios();
  const { cuentaA, cuentaB, ids } = await crearEmpresas();
  const [empresaA1, empresaA2, empresaB] = ids;
  await comoPropietario(
    `insert into core.empresa_usuarios (empresa_id, usuario_id)
     select $1, u from unnest($2::uuid[]) u`,
    [empresaA1, [usuarioId, custodioId, otroId]],
  );
  const base = { usuarioId, custodioId, otroId, cuentaA, cuentaB, empresaA1, empresaA2, empresaB };
  const parcial = { ...base, proveedorA: '', localidadA1: '', localidadA2: '', conceptoDeGastoA1: '' } as Escenario;
  const deA1 = contextoDe(parcial, empresaA1);
  const deA2 = contextoDe(parcial, empresaA2);
  return {
    ...base,
    proveedorA: await crearProveedor(deA1),
    localidadA1: await crearLocalidad(deA1, 'A1'),
    localidadA2: await crearLocalidad(deA2, 'A2'),
    conceptoDeGastoA1: await crearConceptoDeGasto(deA1),
    conceptoDeGastoA2: await crearConceptoDeGasto(deA2),
    cuentaBancariaA1: await crearCuentaBancaria(deA1),
  };
}

let secuencia = 0;

/** Una factura del libro de compras con destino Caja chica (a la que apuntan los comprobantes). */
export async function crearDocumentoDeLibro(escenario: Escenario, contexto = contextoDe(escenario)): Promise<string> {
  secuencia += 1;
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(documentos)
      .values({
        empresaId: contexto.empresaId,
        tipo: 'factura',
        tipoDte: 'FACT',
        proveedorId: escenario.proveedorA,
        nitEmisor: '1234567',
        nombreEmisor: 'Proveedor',
        serie: 'A',
        numero: `CC${secuencia}`,
        autorizacionFel: crypto.randomUUID(),
        fechaEmision: '2026-03-10',
        fechaRecepcion: '2026-03-10',
        periodo: '2026-03-01',
        destino: 'caja-chica',
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

/** Un cheque de Bancos de la empresa A1 (a lo que apuntan la apertura, las reposiciones y los cambios de monto). */
export async function crearMovimiento(escenario: Escenario, tipo: 'cheque' | 'credito' | 'debito' = 'cheque') {
  secuencia += 1;
  const contexto = contextoDe(escenario);
  const [fila] = await enTransaccionSegura(contexto, async (tx) => {
    const [concepto] = await tx
      .insert(conceptos)
      .values({
        empresaId: contexto.empresaId,
        nombre: `Concepto ${secuencia}`,
        aplicaA: 'ambos',
        actividadDeFlujo: 'operacion',
      })
      .returning();
    return tx
      .insert(movimientos)
      .values({
        empresaId: contexto.empresaId,
        cuentaBancariaId: escenario.cuentaBancariaA1,
        tipo,
        fecha: '2026-03-10',
        monto: '100',
        conceptoId: concepto!.id,
        referencia: `CH${secuencia}`,
      })
      .returning();
  });
  return fila!.id;
}
