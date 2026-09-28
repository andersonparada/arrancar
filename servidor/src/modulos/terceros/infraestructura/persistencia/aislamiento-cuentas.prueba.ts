/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): comprueba que
 * las políticas RLS de `politicaPorCuenta()` impiden que una cuenta vea o modifique
 * los terceros de otra, aunque el código no filtre por cuenta. Al estilo de
 * `core/base-datos/aislamiento-empresas.prueba.ts`, pero por cuenta en vez de por empresa.
 */
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { terceros } from './terceros.tablas.js';

let usuarioId: string;
let cuentaA: string;
let cuentaB: string;
let empresaA: string;
let empresaB: string;
let terceroDeB: string;

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();

  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'prueba', nombres: 'Prueba', hashContrasena: 'x' })
    .returning();
  const [empresaDeA, empresaDeB] = await bd
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa de A' },
      { cuentaId: b!.id, nombre: 'Empresa de B' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaA = a!.id;
  cuentaB = b!.id;
  empresaA = empresaDeA!.id;
  empresaB = empresaDeB!.id;

  await enTransaccionSegura({ empresaId: empresaA, cuentaId: cuentaA, usuarioId }, (tx) =>
    tx
      .insert(terceros)
      .values({
        cuentaId: cuentaA,
        tipo: 'individual',
        nombres: 'Juan',
        apellidos: 'Pérez',
        nombreMostrar: 'Juan Pérez',
      })
      .returning(),
  );
  const [tercero2] = await enTransaccionSegura({ empresaId: empresaB, cuentaId: cuentaB, usuarioId }, (tx) =>
    tx
      .insert(terceros)
      .values({
        cuentaId: cuentaB,
        tipo: 'individual',
        nombres: 'María',
        apellidos: 'López',
        nombreMostrar: 'María López',
      })
      .returning(),
  );
  terceroDeB = tercero2!.id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('aislamiento entre cuentas (RLS de politicaPorCuenta)', () => {
  it('cada cuenta solo ve sus propios terceros, aunque la consulta no filtre', async () => {
    const vistosPorA = await enTransaccionSegura({ empresaId: empresaA, cuentaId: cuentaA, usuarioId }, (tx) =>
      tx.select({ nombreMostrar: terceros.nombreMostrar }).from(terceros),
    );
    expect(vistosPorA).toEqual([{ nombreMostrar: 'Juan Pérez' }]);
  });

  it('sin cuenta en la transacción no se ve ningún tercero', async () => {
    expect(await bd.select().from(terceros)).toEqual([]);
  });

  it('no permite modificar ni borrar terceros de otra cuenta', async () => {
    const resultado = await enTransaccionSegura({ empresaId: empresaA, cuentaId: cuentaA, usuarioId }, async (tx) => {
      const actualizados = await tx
        .update(terceros)
        .set({ notas: 'intento de modificación' })
        .where(eq(terceros.id, terceroDeB))
        .returning();
      const borrados = await tx.delete(terceros).where(eq(terceros.id, terceroDeB)).returning();
      return { actualizados: actualizados.length, borrados: borrados.length };
    });
    expect(resultado).toEqual({ actualizados: 0, borrados: 0 });
  });

  it('no permite leer un tercero de otra cuenta por su id', async () => {
    const filas = await enTransaccionSegura({ empresaId: empresaA, cuentaId: cuentaA, usuarioId }, (tx) =>
      tx.select().from(terceros).where(eq(terceros.id, terceroDeB)),
    );
    expect(filas).toEqual([]);
  });
});
