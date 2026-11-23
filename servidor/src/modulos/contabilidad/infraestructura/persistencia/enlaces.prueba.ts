/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los enlaces, el único por rol y
 * llave, los `check`, la llave compuesta con la cuenta y la auditoría permanente.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas as cuentasDeSuscriptor } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { cuentas } from './cuentas.tablas.js';
import { enlaces } from './enlaces.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;
let detalleA1: string;
let detalleA2: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });
const enA1 = () => en(empresaA1);

type Enlace = typeof enlaces.$inferInsert;

const enlace = (cambios: Partial<Enlace> = {}): Enlace => ({
  empresaId: empresaA1,
  rol: 'iva_credito_fiscal',
  cuentaId: detalleA1,
  ...cambios,
});

/** El error de PostgreSQL de la causa: Drizzle envuelve el original en sus propias excepciones. */
async function errorDePostgres(operacion: Promise<unknown>): Promise<DatabaseError | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual;
    }
  }
  return undefined;
}

async function comoPropietario<T extends pg.QueryResultRow>(sql: string): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql)).rows;
  } finally {
    await conexion.end();
  }
}

const insertar = (valores: Enlace, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(enlaces).values(valores).returning());

async function cuentaDeDetalle(empresaId: string) {
  const [fila] = await enTransaccionSegura(en(empresaId), (tx) =>
    tx
      .insert(cuentas)
      .values({
        empresaId,
        codigo: '1',
        nombre: 'Caja',
        nivel: 1,
        naturaleza: 'deudora',
        tipo: 'balance',
        esDeDetalle: true,
        rubro: 'efectivo',
        claseDeFlujo: 'efectivo',
      })
      .returning(),
  );
  return fila!.id;
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [suscriptor] = await bd.insert(cuentasDeSuscriptor).values({ nombre: 'Cuenta A' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'enlacesuno', nombres: 'Enlaces', hashContrasena: 'x' })
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: suscriptor!.id, nombre: 'Empresa A1' },
      { cuentaId: suscriptor!.id, nombre: 'Empresa A2' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaA = suscriptor!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
  detalleA1 = await cuentaDeDetalle(empresaA1);
  detalleA2 = await cuentaDeDetalle(empresaA2);
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('enlaces: seguridad por empresa', () => {
  it('cada empresa ve solo sus enlaces, aunque sean de la misma cuenta', async () => {
    await insertar(enlace());
    await insertar(enlace({ empresaId: empresaA2, cuentaId: detalleA2 }), en(empresaA2));

    const a1 = await enTransaccionSegura(enA1(), (tx) => tx.select().from(enlaces));
    const a2 = await enTransaccionSegura(en(empresaA2), (tx) => tx.select().from(enlaces));

    expect([a1.length, a2.length]).toEqual([1, 1]);
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    await expect(insertar(enlace({ empresaId: empresaA2, cuentaId: detalleA2 }))).rejects.toThrow();
  });

  it('no se enlaza la cuenta de otra empresa (llave compuesta)', async () => {
    const error = await errorDePostgres(insertar(enlace({ rol: 'iva_debito_fiscal', cuentaId: detalleA2 })));

    expect(error?.constraint).toBe('enlaces_cuenta_fk');
  });
});

describe('enlaces: únicos y checks', () => {
  it('un rol sin llave se enlaza una sola vez, pero admite llaves distintas', async () => {
    const repetido = await errorDePostgres(insertar(enlace()));
    await insertar(enlace({ rol: 'cuenta_bancaria', llave: 'banco-1', llaveNombre: 'Monetaria' }));
    await insertar(enlace({ rol: 'cuenta_bancaria', llave: 'banco-2', llaveNombre: 'Ahorro' }));
    await insertar(enlace({ rol: 'cuenta_bancaria' }));
    const mismaLlave = await errorDePostgres(
      insertar(enlace({ rol: 'cuenta_bancaria', llave: 'banco-1', llaveNombre: 'Monetaria' })),
    );
    const sinLlaveRepetido = await errorDePostgres(insertar(enlace({ rol: 'cuenta_bancaria' })));

    expect(repetido?.constraint).toBe('enlaces_rol_llave_unico');
    expect(mismaLlave?.constraint).toBe('enlaces_rol_llave_unico');
    expect(sinLlaveRepetido?.constraint).toBe('enlaces_rol_llave_unico');
  });

  it('el rol sale de la lista cerrada y el nombre de la llave va con la llave', async () => {
    const rolInventado = await errorDePostgres(insertar(enlace({ rol: 'inventado' as Enlace['rol'] })));
    const nombreSinLlave = await errorDePostgres(
      insertar(enlace({ rol: 'iva_no_acreditable', llaveNombre: 'Suelto' })),
    );
    const llaveSinNombre = await errorDePostgres(insertar(enlace({ rol: 'iva_no_acreditable', llave: 'x' })));
    const llaveVacia = await errorDePostgres(
      insertar(enlace({ rol: 'iva_no_acreditable', llave: '  ', llaveNombre: 'Vacía' })),
    );

    expect(rolInventado?.constraint).toBe('enlaces_rol_valido');
    expect(nombreSinLlave?.constraint).toBe('enlaces_nombre_con_llave');
    expect(llaveSinNombre?.constraint).toBe('enlaces_nombre_con_llave');
    expect(llaveVacia?.constraint).toBe('enlaces_llave_no_vacia');
  });

  it('una cuenta enlazada no se puede eliminar (la llave foránea lo impide)', async () => {
    const error = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.delete(cuentas).where(eq(cuentas.id, detalleA1))),
    );

    expect(error?.code).toBe('23503');
  });
});

describe('auditoría permanente', () => {
  it('la de los enlaces no se depura mientras exista la empresa', async () => {
    const filas = await comoPropietario<{ recurso: string }>(
      `select recurso from core.recursos_de_auditoria_permanente where recurso = 'contabilidad.enlaces'`,
    );

    expect(filas).toHaveLength(1);
  });
});
