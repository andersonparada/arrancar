import pg, { DatabaseError } from 'pg';
import { configuracion } from '../../../configuracion.js';
import { bd } from '../../core/base-datos/conexion.js';
import { bdPropietario } from '../../core/base-datos/sembrado-de-prueba.soporte.js';
import { migrarModulos } from '../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../indice.js';
import { clases } from '../infraestructura/persistencia/clases.tablas.js';

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

export async function comoPropietario<T extends pg.QueryResultRow>(
  consulta: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(consulta, valores)).rows;
  } finally {
    await conexion.end();
  }
}

export async function crearLocalidad(empresaId: string, codigo: string, nombre: string): Promise<string> {
  const [tipo] = await comoPropietario<{ id: string }>(
    'insert into empresas.tipos_de_localidad (empresa_id, nombre) values ($1, $2) returning id',
    [empresaId, `Tipo ${codigo}`],
  );
  const [fila] = await comoPropietario<{ id: string }>(
    'insert into empresas.localidades (empresa_id, tipo_id, codigo, nombre) values ($1, $2, $3, $4) returning id',
    [empresaId, tipo!.id, codigo, nombre],
  );
  return fila!.id;
}

/** Dos empresas de la misma cuenta, cada una con su clase y su localidad. */
export interface EscenarioEnBd {
  usuarioId: string;
  cuentaId: string;
  empresaA1: string;
  empresaA2: string;
  claseA1: string;
  claseA2: string;
  localidadA1: string;
  localidadA2: string;
  en(empresaId: string): ContextoEmpresa;
}

async function crearClase(contexto: ContextoEmpresa): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx
      .insert(clases)
      .values({
        empresaId: contexto.empresaId,
        nombre: 'Vehículos',
        incisoFiscal: 'maquinaria_y_vehiculos',
        porcentajeFiscal: '20.00',
      })
      .returning(),
  );
  return fila!.id;
}

async function crearCuentaConDosEmpresas(usuario: string) {
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta A' }).returning();
  const [dueno] = await bd.insert(usuarios).values({ usuario, nombres: 'Activos', hashContrasena: 'x' }).returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  const [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
  return { cuentaId: cuenta!.id, usuarioId: dueno!.id, empresaA1, empresaA2 };
}

/** Migra, limpia y arma la cuenta con sus dos empresas; `usuario` debe ser único entre las pruebas. */
export async function prepararEscenarioEnBd(usuario: string): Promise<EscenarioEnBd> {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const { cuentaId, usuarioId, empresaA1, empresaA2 } = await crearCuentaConDosEmpresas(usuario);
  const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });
  return {
    usuarioId,
    cuentaId,
    empresaA1,
    empresaA2,
    claseA1: await crearClase(en(empresaA1)),
    claseA2: await crearClase(en(empresaA2)),
    localidadA1: await crearLocalidad(empresaA1, 'FINCA', 'Finca La Esperanza'),
    localidadA2: await crearLocalidad(empresaA2, 'OFICINA', 'Oficina Central'),
    en,
  };
}
