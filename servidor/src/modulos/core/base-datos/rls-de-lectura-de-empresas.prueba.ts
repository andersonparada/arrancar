/**
 * Prueba de integración contra PostgreSQL: RLS de lectura de `core.empresas` por cuenta y sus seis funciones
 * `security definer` (`docs/modulos/diseno-rls-de-core.md` R-4). En una unidad de trabajo de la cuenta A no se ve ninguna
 * empresa de la B; lo que la sesión, soporte y la bitácora necesitan ver más allá pasa por las funciones.
 */
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ContextoEmpresa } from '../compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresaUsuarios, empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { EmpresasDeLaSesionDrizzle } from '../identidad/infraestructura/persistencia/empresas-de-la-sesion.drizzle.js';
import { RepositorioUsuariosDrizzle } from '../identidad/infraestructura/persistencia/repositorio-usuarios.drizzle.js';
import { Identificador } from '../compartido/dominio/identificador.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { bd, grupoConexiones } from './conexion.js';
import { bdPropietario } from './sembrado-de-prueba.soporte.js';

const nombresDeCuentas = ['RLS de lectura A', 'RLS de lectura B'];
const nombresDeUsuarios = ['rlslecturacompartido', 'rlslecturasolo', 'rlslecturaotro'];

let enA: ContextoEmpresa;
let cuentaA: string;
let cuentaB: string;
let empresaA1: string;
let empresaA2: string;
let empresaB1: string;
let compartido: string;
let soloEnA: string;
let soloEnB: string;

async function limpiar(): Promise<void> {
  await bdPropietario.delete(cuentas).where(inArray(cuentas.nombre, nombresDeCuentas));
  await bdPropietario.delete(usuarios).where(inArray(usuarios.usuario, nombresDeUsuarios));
}

async function sembrar(): Promise<void> {
  await limpiar();
  const [a, b] = await bdPropietario
    .insert(cuentas)
    .values(nombresDeCuentas.map((nombre) => ({ nombre })))
    .returning();
  [cuentaA, cuentaB] = [a!.id, b!.id];
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuentaA, nombre: 'Lectura A1', nit: '1234567-8' },
      { cuentaId: cuentaA, nombre: 'Lectura A2', activa: false },
      { cuentaId: cuentaB, nombre: 'Lectura B1' },
    ])
    .returning();
  [empresaA1, empresaA2, empresaB1] = filas.map((fila) => fila.id) as [string, string, string];
  const gente = await bdPropietario
    .insert(usuarios)
    .values(nombresDeUsuarios.map((usuario) => ({ usuario, nombres: 'Rls', hashContrasena: 'x' })))
    .returning();
  [compartido, soloEnA, soloEnB] = gente.map((fila) => fila.id) as [string, string, string];
  await bdPropietario.insert(empresaUsuarios).values([
    { empresaId: empresaA1, usuarioId: compartido },
    { empresaId: empresaB1, usuarioId: compartido },
    { empresaId: empresaA1, usuarioId: soloEnA },
    { empresaId: empresaA2, usuarioId: soloEnA },
    { empresaId: empresaB1, usuarioId: soloEnB },
  ]);
  enA = { empresaId: empresaA1, cuentaId: cuentaA, usuarioId: soloEnA };
}

beforeAll(sembrar);

afterAll(async () => {
  await limpiar();
  await grupoConexiones.end();
});

describe('la lectura de core.empresas es por cuenta', () => {
  it('en una unidad de trabajo de A se ven las empresas de A y ninguna de B', async () => {
    const ids = [empresaA1, empresaA2, empresaB1];
    const vistas = await enTransaccionSegura(enA, (tx) =>
      tx.select({ id: empresas.id }).from(empresas).where(inArray(empresas.id, ids)),
    );

    expect(vistas.map((fila) => fila.id).sort()).toEqual([empresaA1, empresaA2].sort());
  });

  it('una unión que olvida el filtro de cuenta tampoco trae el nombre de una empresa de B', async () => {
    const filas = await enTransaccionSegura(enA, (tx) =>
      tx
        .select({ nombre: empresas.nombre })
        .from(empresaUsuarios)
        .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
        .where(eq(empresaUsuarios.usuarioId, compartido)),
    );

    expect(filas).toEqual([{ nombre: 'Lectura A1' }]);
  });

  it('sin variables de la transacción no se ve ninguna empresa', async () => {
    const vistas = await bd
      .select({ id: empresas.id })
      .from(empresas)
      .where(inArray(empresas.id, [empresaA1]));

    expect(vistas).toEqual([]);
  });
});

describe('las empresas de la sesión pasan por funciones del dueño', () => {
  const sesion = () => new EmpresasDeLaSesionDrizzle(bd);

  it('buscar devuelve cualquier empresa con su cuenta, sin variables', async () => {
    expect(await sesion().buscar(empresaB1)).toEqual({
      id: empresaB1,
      nombre: 'Lectura B1',
      nit: null,
      cuentaId: cuentaB,
      cuentaNombre: 'RLS de lectura B',
    });
    expect(await sesion().buscar('00000000-0000-4000-8000-000000000000')).toBeNull();
  });

  it('disponiblesPara y esMiembro dan solo las empresas activas donde trabaja el usuario', async () => {
    const disponibles = await sesion().disponiblesPara(soloEnA);

    expect(disponibles.map((fila) => fila.id)).toEqual([empresaA1]);
    expect(await sesion().esMiembro(soloEnA, empresaA1)).toBe(true);
    expect(await sesion().esMiembro(soloEnA, empresaA2)).toBe(false);
    expect(await sesion().esMiembro(soloEnA, empresaB1)).toBe(false);
  });

  it('un usuario de dos cuentas ve las empresas de las dos, ordenadas por cuenta', async () => {
    const disponibles = await sesion().disponiblesPara(compartido);

    expect(disponibles.map((fila) => fila.nombre)).toEqual(['Lectura A1', 'Lectura B1']);
  });

  it('todas incluye las de todas las cuentas, también las inactivas', async () => {
    const ids = (await sesion().todas()).map((fila) => fila.id);

    expect(ids).toEqual(expect.arrayContaining([empresaA1, empresaA2, empresaB1]));
  });
});

describe('pertenencia del usuario (quién puede cambiar a un usuario compartido)', () => {
  const repositorio = new RepositorioUsuariosDrizzle(() => bd);
  const pertenencia = (usuario: string, cuenta: string) =>
    repositorio.pertenenciaEn(Identificador.desde(usuario), cuenta);

  it('un usuario compartido entre A y B no es solo de A: cuenta la otra sin decir cuál', async () => {
    expect(await pertenencia(compartido, cuentaA)).toEqual({ enLaCuenta: true, otrasCuentas: 1 });
  });

  it('un usuario solo de A tiene cero otras cuentas', async () => {
    expect(await pertenencia(soloEnA, cuentaA)).toEqual({ enLaCuenta: true, otrasCuentas: 0 });
  });

  it('un usuario de B no trabaja en A', async () => {
    expect(await pertenencia(soloEnB, cuentaA)).toEqual({ enLaCuenta: false, otrasCuentas: 1 });
  });

  it('sigue dando lo mismo dentro de una unidad de trabajo de A, donde empresas solo muestra A', async () => {
    const dentro = await enTransaccionSegura(enA, (tx) =>
      new RepositorioUsuariosDrizzle(() => tx).pertenenciaEn(Identificador.desde(compartido), cuentaA),
    );

    expect(dentro).toEqual({ enLaCuenta: true, otrasCuentas: 1 });
  });
});

describe('resumen de cuentas y nombres de empresas', () => {
  it('resumen_de_cuentas cuenta las empresas de cada cuenta', async () => {
    const { rows } = await bd.execute<{ cuenta_id: string; total_empresas: number }>(
      sql`select * from core.resumen_de_cuentas() where cuenta_id in (${cuentaA}::uuid, ${cuentaB}::uuid)`,
    );
    const totales = Object.fromEntries(rows.map((fila) => [fila.cuenta_id, fila.total_empresas]));

    expect(totales).toEqual({ [cuentaA]: 2, [cuentaB]: 1 });
  });

  it('nombres_de_empresas devuelve solo id y nombre de las pedidas', async () => {
    const { rows } = await bd.execute(
      sql`select * from core.nombres_de_empresas(array[${empresaB1}::uuid, ${empresaA2}::uuid])`,
    );

    expect(rows.map((fila) => fila.nombre).sort()).toEqual(['Lectura A2', 'Lectura B1']);
    expect(Object.keys(rows[0]!).sort()).toEqual(['id', 'nombre']);
  });
});

describe('las funciones solo las ejecuta la aplicación', () => {
  const funciones = [
    'empresa_de_la_sesion',
    'empresas_del_usuario',
    'todas_las_empresas',
    'pertenencia_del_usuario',
    'resumen_de_cuentas',
    'nombres_de_empresas',
  ];

  it('son del dueño con security definer y sin execute para public', async () => {
    const { rows } = await bdPropietario.execute<{ proname: string; seguridad: boolean; acl: string | null }>(sql`
      select proname, prosecdef as seguridad, proacl::text as acl
      from pg_proc where pronamespace = 'core'::regnamespace and proname in (${sql.join(
        funciones.map((nombre) => sql`${nombre}`),
        sql`, `,
      )})`);

    expect(rows).toHaveLength(funciones.length);
    for (const fila of rows) {
      expect(fila.seguridad).toBe(true);
      expect(fila.acl).toContain('arrancar_app=X/');
      expect(fila.acl).not.toMatch(/(^\{|,)=X\//);
    }
  });
});
