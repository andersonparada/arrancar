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
  ConsultaFueraDeUnidadDeTrabajo,
  ContextoDistintoEnLaTransaccion,
  UnidadDeTrabajoPostgres,
  transaccionEnCurso,
} from './unidad-de-trabajo-postgres.js';

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
let enEmpresaA: ContextoEmpresa;
let enEmpresaB: ContextoEmpresa;

class FalloProvocado extends Error {}

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

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
  enEmpresaA = { empresaId: a!.id, cuentaId: cuenta!.id, usuarioId: usuario!.id };
  enEmpresaB = { empresaId: b!.id, cuentaId: cuenta!.id, usuarioId: usuario!.id };

  await unidadDeTrabajo.ejecutar(enEmpresaA, async () => void (await registrarAcceso(enEmpresaA, 'de-a')));
  await unidadDeTrabajo.ejecutar(enEmpresaB, async () => void (await registrarAcceso(enEmpresaB, 'de-b')));
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('unidad de trabajo sobre PostgreSQL', () => {
  it('no deja consultar fuera de una unidad de trabajo', () => {
    expect(() => transaccionEnCurso()).toThrow(ConsultaFueraDeUnidadDeTrabajo);
  });

  it('solo muestra las filas de la empresa del contexto, aunque la consulta no filtre', async () => {
    const vistosDesdeA = await unidadDeTrabajo.ejecutar(enEmpresaA, recursosVisibles);
    const vistosDesdeB = await unidadDeTrabajo.ejecutar(enEmpresaB, recursosVisibles);

    expect(vistosDesdeA).toEqual(['de-a']);
    expect(vistosDesdeB).toEqual(['de-b']);
  });

  it('si algo falla, no guarda nada de lo que hizo', async () => {
    const trabajoQueFalla = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await registrarAcceso(enEmpresaA, 'a-medias');
      throw new FalloProvocado();
    });

    await expect(trabajoQueFalla).rejects.toThrow(FalloProvocado);
    expect(await unidadDeTrabajo.ejecutar(enEmpresaA, recursosVisibles)).toEqual(['de-a']);
  });

  it('una unidad anidada con el mismo contexto usa la misma transacción', async () => {
    const [externa, interna] = await unidadDeTrabajo.ejecutar(enEmpresaA, async () => [
      transaccionEnCurso(),
      await unidadDeTrabajo.ejecutar({ ...enEmpresaA }, async () => transaccionEnCurso()),
    ]);

    expect(interna).toBe(externa);
  });

  it('una unidad anidada no puede cambiar de empresa', async () => {
    const cambioDeEmpresa = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutar(enEmpresaB, recursosVisibles),
    );

    await expect(cambioDeEmpresa).rejects.toThrow(ContextoDistintoEnLaTransaccion);
  });

  it('una unidad anidada no puede ampliar los recursos para asignar ni el alcance', async () => {
    const paraAsignar = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutar({ ...enEmpresaA, recursosParaAsignar: ['prueba.registros'] }, recursosVisibles),
    );
    const sinAsignar = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutar({ ...enEmpresaA, sinAsignarAlCrear: true }, recursosVisibles),
    );

    await expect(paraAsignar).rejects.toThrow(ContextoDistintoEnLaTransaccion);
    await expect(sinAsignar).rejects.toThrow(ContextoDistintoEnLaTransaccion);
  });
});
