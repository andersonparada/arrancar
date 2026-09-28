/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): comprueba que
 * las políticas RLS impiden leer o escribir datos de otra empresa, aunque la
 * consulta no filtre por empresa. Usa `core.accesos_datos`, que tiene la misma
 * política que tendrán todas las tablas de negocio.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { accesosDatos } from '../autorizacion/infraestructura/persistencia/accesos-datos.tablas.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { bd, grupoConexiones } from './conexion.js';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import { migrarModulos } from './migrador.js';

let usuarioId: string;
let cuentaId: string;
let empresaA: string;
let empresaB: string;

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

const insertarAcceso = (empresaDeLaFila: string, recurso: string) => ({
  empresaId: empresaDeLaFila,
  usuarioId,
  recurso,
  registroId: randomUUID(),
});

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();

  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta de prueba' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'prueba', nombres: 'Prueba', hashContrasena: 'x' })
    .returning();
  const [a, b] = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A' },
      { cuentaId: cuenta!.id, nombre: 'Empresa B' },
    ])
    .returning();
  usuarioId = usuario!.id;
  cuentaId = cuenta!.id;
  empresaA = a!.id;
  empresaB = b!.id;

  await enTransaccionSegura({ empresaId: empresaA, cuentaId, usuarioId }, (tx) =>
    tx.insert(accesosDatos).values(insertarAcceso(empresaA, 'dato.de.a')),
  );
  await enTransaccionSegura({ empresaId: empresaB, cuentaId, usuarioId }, (tx) =>
    tx.insert(accesosDatos).values(insertarAcceso(empresaB, 'dato.de.b')),
  );
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('aislamiento entre empresas (RLS)', () => {
  it('cada empresa solo ve sus propias filas, aunque la consulta no filtre', async () => {
    const vistasPorA = await enTransaccionSegura({ empresaId: empresaA, cuentaId, usuarioId }, (tx) =>
      tx.select({ recurso: accesosDatos.recurso }).from(accesosDatos),
    );
    expect(vistasPorA).toEqual([{ recurso: 'dato.de.a' }]);
  });

  it('sin empresa en la transacción no se ve ninguna fila', async () => {
    expect(await bd.select().from(accesosDatos)).toEqual([]);
  });

  it('no permite insertar filas a nombre de otra empresa', async () => {
    await expect(
      enTransaccionSegura({ empresaId: empresaA, cuentaId, usuarioId }, (tx) =>
        tx.insert(accesosDatos).values(insertarAcceso(empresaB, 'intruso')),
      ),
    ).rejects.toThrow();
  });

  it('no permite modificar ni borrar filas de otra empresa', async () => {
    const resultado = await enTransaccionSegura({ empresaId: empresaA, cuentaId, usuarioId }, async (tx) => {
      const actualizadas = await tx
        .update(accesosDatos)
        .set({ recurso: 'modificado' })
        .where(eq(accesosDatos.recurso, 'dato.de.b'))
        .returning();
      const borradas = await tx.delete(accesosDatos).where(eq(accesosDatos.recurso, 'dato.de.b')).returning();
      return { actualizadas: actualizadas.length, borradas: borradas.length };
    });
    expect(resultado).toEqual({ actualizadas: 0, borradas: 0 });
  });
});
