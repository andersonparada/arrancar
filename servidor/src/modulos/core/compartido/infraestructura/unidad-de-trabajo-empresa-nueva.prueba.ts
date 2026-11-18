import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { correlativos } from './persistencia/correlativos.tablas.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import {
  ContextoDistintoEnLaTransaccion,
  EmpresaNoEsNueva,
  UnidadDeTrabajoPostgres,
  transaccionEnCurso,
} from './unidad-de-trabajo-postgres.js';

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
let enEmpresaA: ContextoEmpresa;
let enEmpresaB: ContextoEmpresa;

class FalloProvocado extends Error {}

function registrarAcceso(contexto: ContextoEmpresa, recurso: string) {
  return transaccionEnCurso().insert(correlativos).values({ empresaId: contexto.empresaId, clave: recurso });
}

function recursosVisibles(): Promise<string[]> {
  return transaccionEnCurso()
    .select({ recurso: correlativos.clave })
    .from(correlativos)
    .then((filas) => filas.map((fila) => fila.recurso).sort());
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();

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
  enEmpresaA = { empresaId: a!.id, cuentaId: cuenta!.id, usuarioId: usuario!.id };
  enEmpresaB = { empresaId: b!.id, cuentaId: cuenta!.id, usuarioId: usuario!.id };
  await unidadDeTrabajo.ejecutar(enEmpresaA, async () => void (await registrarAcceso(enEmpresaA, 'de-a')));
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('ejecutar en una empresa nueva de la cuenta', () => {
  function nuevaDe(base: ContextoEmpresa): ContextoEmpresa {
    return { ...base, empresaId: randomUUID() };
  }

  /** Crea la empresa en la transacción en curso y deja un dato suyo, como hace `RegistrarEmpresa`. */
  async function crearYSembrar(nueva: ContextoEmpresa, clave: string): Promise<string[]> {
    await transaccionEnCurso()
      .insert(empresas)
      .values({ id: nueva.empresaId, cuentaId: nueva.cuentaId, nombre: clave });
    await registrarAcceso(nueva, clave);
    return recursosVisibles();
  }

  it('ve la empresa nueva dentro y vuelve a la anterior al terminar, en la misma transacción', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const [dentro, despues] = await unidadDeTrabajo.ejecutar(enEmpresaA, async () => [
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva, () => crearYSembrar(nueva, 'de-nueva')),
      await recursosVisibles(),
    ]);

    expect(dentro).toEqual(['de-nueva']);
    expect(despues).toEqual(['de-a']);
  });

  it('crear dos empresas en un mismo libro es todo o nada', async () => {
    const [primera, segunda] = [nuevaDe(enEmpresaA), nuevaDe(enEmpresaA)];
    const libro = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(primera, () => crearYSembrar(primera, 'primera'));
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(segunda, async () => {
        await crearYSembrar(segunda, 'segunda');
        throw new FalloProvocado();
      });
    });

    await expect(libro).rejects.toThrow(FalloProvocado);
    const guardadas = await bd
      .select()
      .from(empresas)
      .where(inArray(empresas.id, [primera.empresaId, segunda.empresaId]));
    expect(guardadas).toEqual([]);
  });

  it('dos empresas nuevas en el mismo libro se guardan juntas', async () => {
    const [primera, segunda] = [nuevaDe(enEmpresaA), nuevaDe(enEmpresaA)];
    await unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(primera, () => crearYSembrar(primera, 'primera'));
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(segunda, () => crearYSembrar(segunda, 'segunda'));
    });

    const guardadas = await bd
      .select()
      .from(empresas)
      .where(inArray(empresas.id, [primera.empresaId, segunda.empresaId]));
    expect(guardadas).toHaveLength(2);
  });

  it('si falla dentro, deshace solo lo suyo y la empresa anterior sigue activa', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const resultado = await unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await unidadDeTrabajo
        .ejecutarEnEmpresaNueva(nueva, async () => {
          await crearYSembrar(nueva, 'fallida');
          throw new FalloProvocado();
        })
        .catch(() => undefined);
      return recursosVisibles();
    });

    expect(resultado).toEqual(['de-a']);
  });

  it('rechaza una empresa que ya existía en la cuenta, con o sin acceso del usuario', async () => {
    const existente = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaB, recursosVisibles),
    );
    const propia = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaA, recursosVisibles),
    );

    await expect(existente).rejects.toThrow(EmpresaNoEsNueva);
    await expect(propia).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza abrir dos veces la misma empresa nueva en una transacción', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const repetida = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva, async () => undefined);
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva, async () => undefined);
    });

    await expect(repetida).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('no deja cambiar de cuenta ni de usuario', async () => {
    const deOtraCuenta = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(
        { ...nuevaDe(enEmpresaA), cuentaId: enEmpresaA.usuarioId },
        recursosVisibles,
      ),
    );

    await expect(deOtraCuenta).rejects.toThrow(ContextoDistintoEnLaTransaccion);
  });

  it('sin transacción en curso, abre una y también exige una empresa nueva', async () => {
    const nueva = nuevaDe(enEmpresaA);
    expect(await unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva, () => crearYSembrar(nueva, 'sola'))).toEqual(['sola']);
    await expect(unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaB, recursosVisibles)).rejects.toThrow(
      EmpresaNoEsNueva,
    );
  });
});
