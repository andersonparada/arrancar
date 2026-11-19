/**
 * Prueba de integración contra PostgreSQL: RLS de escritura por cuenta de las tablas de `core` que la sesión lee sin
 * empresa (`docs/modulos/diseno-rls-de-core.md` R-3). En una unidad de trabajo de la cuenta A nada se escribe en la B.
 */
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rolPermisos, roles } from '../autorizacion/infraestructura/persistencia/roles.tablas.js';
import {
  usuarioPermisos,
  usuarioRoles,
} from '../autorizacion/infraestructura/persistencia/permisos-de-usuario.tablas.js';
import type { ContextoEmpresa } from '../compartido/aplicacion/contexto-empresa.js';
import {
  transaccionEnCurso,
  UnidadDeTrabajoPostgres,
} from '../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresaUsuarios, empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { bd, grupoConexiones } from './conexion.js';
import { bdPropietario } from './sembrado-de-prueba.soporte.js';

let enA: ContextoEmpresa;
let cuentaB: string;
let empresaB: string;
let rolB: string;
let usuarioId: string;
let rolA: string;
let empresaA2: string;

/** La base rechazó por RLS (código 42501): Drizzle envuelve el error de PostgreSQL en `cause`. */
const porRls = { cause: { code: '42501', message: expect.stringContaining('row-level security') } };

async function sembrar(): Promise<void> {
  await bdPropietario.delete(cuentas).where(eq(cuentas.nombre, 'RLS de escritura A'));
  await bdPropietario.delete(cuentas).where(eq(cuentas.nombre, 'RLS de escritura B'));
  const [cuentaA, otra] = await bdPropietario
    .insert(cuentas)
    .values([{ nombre: 'RLS de escritura A' }, { nombre: 'RLS de escritura B' }])
    .returning();
  cuentaB = otra!.id;
  await bdPropietario.delete(usuarios).where(eq(usuarios.usuario, 'rlsescritura'));
  const [usuario] = await bdPropietario
    .insert(usuarios)
    .values({ usuario: 'rlsescritura', nombres: 'Rls', hashContrasena: 'x' })
    .returning();
  usuarioId = usuario!.id;
  const filasDeEmpresas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuentaA!.id, nombre: 'A1' },
      { cuentaId: cuentaA!.id, nombre: 'A2' },
      { cuentaId: cuentaB, nombre: 'B1' },
    ])
    .returning();
  empresaA2 = filasDeEmpresas[1]!.id;
  empresaB = filasDeEmpresas[2]!.id;
  enA = { empresaId: filasDeEmpresas[0]!.id, cuentaId: cuentaA!.id, usuarioId };
  const filasDeRoles = await bdPropietario
    .insert(roles)
    .values([
      { cuentaId: cuentaA!.id, nombre: 'Rol A' },
      { cuentaId: cuentaB, nombre: 'Rol B' },
    ])
    .returning();
  rolA = filasDeRoles[0]!.id;
  rolB = filasDeRoles[1]!.id;
  await bdPropietario.insert(empresaUsuarios).values({ empresaId: empresaB, usuarioId });
}

beforeAll(sembrar);

afterAll(async () => {
  await bdPropietario.delete(cuentas).where(eq(cuentas.nombre, 'RLS de escritura A'));
  await bdPropietario.delete(cuentas).where(eq(cuentas.nombre, 'RLS de escritura B'));
  await bdPropietario.delete(usuarios).where(eq(usuarios.usuario, 'rlsescritura'));
  await grupoConexiones.end();
});

describe('en la cuenta A no se escribe en la cuenta B', () => {
  it('no inserta una empresa con la cuenta B', async () => {
    const intento = enTransaccionSegura(enA, (tx) =>
      tx.insert(empresas).values({ cuentaId: cuentaB, nombre: 'Intrusa' }),
    );

    await expect(intento).rejects.toMatchObject(porRls);
  });

  it('no edita una empresa de la cuenta B (no la alcanza: cero filas)', async () => {
    const cambiadas = await enTransaccionSegura(enA, (tx) =>
      tx.update(empresas).set({ nombre: 'Cambiada' }).where(eq(empresas.id, empresaB)).returning(),
    );

    expect(cambiadas).toEqual([]);
  });

  it('no da acceso a un usuario en una empresa de B, y quitarlo no alcanza (cero filas)', async () => {
    const dar = enTransaccionSegura(enA, (tx) =>
      tx.insert(empresaUsuarios).values({ empresaId: empresaB, usuarioId }),
    ).catch((error: unknown) => error);
    const quitadas = await enTransaccionSegura(enA, (tx) =>
      tx.delete(empresaUsuarios).where(eq(empresaUsuarios.empresaId, empresaB)).returning(),
    );

    expect(await dar).toMatchObject(porRls);
    expect(quitadas).toEqual([]);
  });

  it('no crea ni edita un rol de B', async () => {
    const crear = enTransaccionSegura(enA, (tx) =>
      tx.insert(roles).values({ cuentaId: cuentaB, nombre: 'Rol intruso' }),
    ).catch((error: unknown) => error);
    const editadas = await enTransaccionSegura(enA, (tx) =>
      tx.update(roles).set({ nombre: 'Cambiado' }).where(eq(roles.id, rolB)).returning(),
    );

    expect(await crear).toMatchObject(porRls);
    expect(editadas).toEqual([]);
  });

  it('no agrega permisos a un rol de B', async () => {
    const intento = enTransaccionSegura(enA, (tx) => tx.insert(rolPermisos).values({ rolId: rolB, permiso: 'a.b' }));

    await expect(intento).rejects.toMatchObject(porRls);
  });

  it('no asigna roles ni permisos directos en la cuenta B', async () => {
    const rol = enTransaccionSegura(enA, (tx) =>
      tx.insert(usuarioRoles).values({ cuentaId: cuentaB, usuarioId, rolId: rolB }),
    ).catch((error: unknown) => error);
    const permiso = enTransaccionSegura(enA, (tx) =>
      tx.insert(usuarioPermisos).values({ cuentaId: cuentaB, usuarioId, permiso: 'a.b' }),
    ).catch((error: unknown) => error);

    expect(await rol).toMatchObject(porRls);
    expect(await permiso).toMatchObject(porRls);
  });

  it('sin variables de la transacción tampoco escribe', async () => {
    const intento = bd.insert(empresas).values({ cuentaId: cuentaB, nombre: 'Sin contexto' });

    await expect(intento).rejects.toMatchObject(porRls);
  });
});

describe('en la cuenta A sí se escribe en la A', () => {
  it('registra y edita una empresa, y da y quita acceso', async () => {
    const resultado = await enTransaccionSegura(enA, async (tx) => {
      const [nueva] = await tx.insert(empresas).values({ cuentaId: enA.cuentaId, nombre: 'Nueva' }).returning();
      await tx.update(empresas).set({ nombre: 'Editada' }).where(eq(empresas.id, nueva!.id));
      await tx.insert(empresaUsuarios).values({ empresaId: nueva!.id, usuarioId });
      const quitadas = await tx.delete(empresaUsuarios).where(eq(empresaUsuarios.empresaId, nueva!.id)).returning();
      return { quitadas: quitadas.length };
    });

    expect(resultado).toEqual({ quitadas: 1 });
  });

  it('crea roles, les da permisos y los asigna con permisos directos', async () => {
    await enTransaccionSegura(enA, async (tx) => {
      const [rol] = await tx.insert(roles).values({ cuentaId: enA.cuentaId, nombre: 'Rol nuevo' }).returning();
      await tx.insert(rolPermisos).values({ rolId: rol!.id, permiso: 'a.b' });
      await tx.update(roles).set({ nombre: 'Rol editado' }).where(eq(roles.id, rol!.id));
      await tx.insert(usuarioRoles).values({ cuentaId: enA.cuentaId, usuarioId, rolId: rolA });
      await tx.insert(usuarioPermisos).values({ cuentaId: enA.cuentaId, usuarioId, permiso: 'a.b' });
      await tx
        .delete(usuarioPermisos)
        .where(and(eq(usuarioPermisos.cuentaId, enA.cuentaId), eq(usuarioPermisos.usuarioId, usuarioId)));
      await tx.delete(rolPermisos).where(eq(rolPermisos.rolId, rol!.id));
      await tx.delete(roles).where(eq(roles.id, rol!.id));
    });

    const asignados = await bdPropietario.select().from(usuarioRoles).where(eq(usuarioRoles.cuentaId, enA.cuentaId));
    expect(asignados).toHaveLength(1);
  });

  it('la lectura de empresas es por cuenta: sin variables no se ve ninguna', async () => {
    const vistas = await bd.select({ id: empresas.id }).from(empresas).where(eq(empresas.id, empresaA2));

    expect(vistas).toEqual([]);
  });

  it('una empresa vieja no pasa por nueva: la base no deja cambiar su fecha de creación', async () => {
    const reciente = new UnidadDeTrabajoPostgres(bd).ejecutar(enA, async () => {
      await transaccionEnCurso().update(empresas).set({ creadoEn: new Date() }).where(eq(empresas.id, empresaA2));
    });

    await expect(reciente).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  it('nadie borra empresas desde la aplicación', async () => {
    const intento = enTransaccionSegura(enA, (tx) => tx.delete(empresas).where(eq(empresas.id, empresaA2)));

    await expect(intento).rejects.toMatchObject({ cause: { code: '42501' } });
  });
});
