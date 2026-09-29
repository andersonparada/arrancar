/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): la auditoría
 * toma cuenta, empresa y usuario de la transacción, cada cuenta ve solo la suya y
 * nadie puede cambiarla ni borrarla; la autoría de un registro se llena sola.
 */
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { DepuradorDeAuditoriaDrizzle } from '../../bitacora/infraestructura/persistencia/depurador-de-auditoria.drizzle.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../pruebas/en-transaccion-segura.js';
import { AuditoriaPostgres } from './auditoria-postgres.js';
import { auditoria } from './persistencia/auditoria.tablas.js';

let enA: ContextoEmpresa;
let enB: ContextoEmpresa;
let otroUsuarioDeA: ContextoEmpresa;

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

async function prepararDosCuentas(): Promise<void> {
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [ana, luis] = await bd
    .insert(usuarios)
    .values([
      { usuario: 'ana', nombres: 'Ana', hashContrasena: 'x' },
      { usuario: 'luis', nombres: 'Luis', hashContrasena: 'x' },
    ])
    .returning();
  const [empresaDeA, empresaDeB] = await bd
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa de A' },
      { cuentaId: b!.id, nombre: 'Empresa de B' },
    ])
    .returning();
  enA = { cuentaId: a!.id, empresaId: empresaDeA!.id, usuarioId: ana!.id };
  enB = { cuentaId: b!.id, empresaId: empresaDeB!.id, usuarioId: ana!.id };
  otroUsuarioDeA = { ...enA, usuarioId: luis!.id };
}

const leerAuditoria = (contexto: ContextoEmpresa) => enTransaccionSegura(contexto, (tx) => tx.select().from(auditoria));

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();
  await prepararDosCuentas();
  await enTransaccionSegura(enA, () =>
    new AuditoriaPostgres().registrar({
      recurso: 'terceros.contactos',
      registroId: 'contacto-1',
      accion: 'eliminar',
      anterior: { nombre: 'Ana' },
    }),
  );
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('auditoría', () => {
  it('toma la cuenta, la empresa y el usuario de la transacción', async () => {
    expect(await leerAuditoria(enA)).toEqual([
      expect.objectContaining({
        cuentaId: enA.cuentaId,
        empresaId: enA.empresaId,
        usuarioId: enA.usuarioId,
        accion: 'eliminar',
        anterior: { nombre: 'Ana' },
      }),
    ]);
  });

  it('otra cuenta no la ve', async () => {
    expect(await leerAuditoria(enB)).toEqual([]);
  });

  it('nadie puede cambiarla ni borrarla', async () => {
    const intento = await enTransaccionSegura(enA, async (tx) => ({
      cambiadas: await tx.update(auditoria).set({ motivo: 'borrar huellas' }).returning(),
      borradas: await tx.delete(auditoria).returning(),
    }));

    expect(intento).toEqual({ cambiadas: [], borradas: [] });
    expect(await leerAuditoria(enA)).toEqual([expect.objectContaining({ motivo: null })]);
  });
});

function haceMeses(meses: number): Date {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - meses);
  return fecha;
}

describe('conservación de la auditoría', () => {
  it('nunca borra lo de menos de 60 meses, aunque se pidan cero o doce', async () => {
    await enTransaccionSegura(enA, (tx) =>
      tx.insert(auditoria).values([
        { recurso: 'x.y', registroId: 'reciente', accion: 'eliminar', creadoEn: haceMeses(13) },
        { recurso: 'x.y', registroId: 'vencido', accion: 'eliminar', creadoEn: haceMeses(61) },
      ]),
    );
    const depurador = new DepuradorDeAuditoriaDrizzle(bd);

    const conCero = await depurador.borrarAnterioresA(0);
    const conDoce = await depurador.borrarAnterioresA(12);
    const conSesenta = await depurador.borrarAnterioresA(60);

    expect({ conCero, conDoce, conSesenta }).toEqual({ conCero: 1, conDoce: 0, conSesenta: 0 });
    const conservados = (await leerAuditoria(enA)).map((entrada) => entrada.registroId).sort();
    expect(conservados).toEqual(['contacto-1', 'reciente']);
  });

  it('no deja borrar una cuenta que tiene auditoría', async () => {
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    const intento = conexion.query('delete from core.cuentas where id = $1', [enA.cuentaId]);
    await expect(intento).rejects.toThrow(/auditoria_cuenta_id_cuentas_id_fk/);
    await conexion.end();
  });
});

describe('autoría', () => {
  it('guarda quién creó el registro y quién lo cambió por última vez', async () => {
    const [creada] = await enTransaccionSegura(enA, (tx) =>
      tx.insert(empresas).values({ cuentaId: enA.cuentaId, nombre: 'Finca nueva' }).returning(),
    );
    const [cambiada] = await enTransaccionSegura(otroUsuarioDeA, (tx) =>
      tx.update(empresas).set({ nombre: 'Finca El Roble' }).where(eq(empresas.id, creada!.id)).returning(),
    );

    expect(creada).toMatchObject({ creadoPor: enA.usuarioId, actualizadoPor: enA.usuarioId });
    expect(cambiada).toMatchObject({ creadoPor: enA.usuarioId, actualizadoPor: otroUsuarioDeA.usuarioId });
  });
});
