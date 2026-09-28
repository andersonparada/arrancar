import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { bd, grupoConexiones } from '../base-datos/conexion.js';
import { migrarModulos } from '../base-datos/migrador.js';
import { RegistroModulos } from '../modulos-sistema/registro-modulos.js';
import { establecerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { accesosDatos } from '../autorizacion/infraestructura/persistencia/accesos-datos.tablas.js';
import type { ContextoEmpresa } from '../compartido/aplicacion/contexto-empresa.js';
import type { Operador } from '../compartido/aplicacion/operador.js';
import {
  transaccionEnCurso,
  UnidadDeTrabajoPostgres,
} from '../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cuentas } from '../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { ModuloNoDisponible } from './aplicacion/errores.js';
import { Mediador } from './aplicacion/mediador.js';
import { ModulosActivosDeLaCuentaEnRegistro } from './infraestructura/modulos-activos-de-la-cuenta-en-registro.js';

declare module '../contratos/mediador.contratos.js' {
  interface OrdenesEntreModulos {
    'prueba.registrar_acceso': { datos: { recurso: string }; respuesta: void };
  }
  interface AvisosEntreModulos {
    'prueba.avisar_de_registro': { recurso: string };
  }
}

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);

class FalloProvocado extends Error {}

let operador: Operador;

function registrarAcceso(contexto: ContextoEmpresa, recurso: string) {
  return transaccionEnCurso()
    .insert(accesosDatos)
    .values({ empresaId: contexto.empresaId, usuarioId: contexto.usuarioId, recurso, registroId: randomUUID() });
}

function recursosGuardados(): Promise<string[]> {
  return transaccionEnCurso()
    .select({ recurso: accesosDatos.recurso })
    .from(accesosDatos)
    .then((filas) => filas.map((fila) => fila.recurso).sort());
}

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

beforeAll(async () => {
  establecerRegistroModulos(new RegistroModulos(definicionesModulos));
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();

  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta del mediador' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'mediador', nombres: 'Mediador', hashContrasena: 'x' })
    .returning();
  const [empresa] = await bd
    .insert(empresas)
    .values({ cuentaId: cuenta!.id, nombre: 'Empresa del mediador' })
    .returning();
  operador = { cuentaId: cuenta!.id, usuarioId: usuario!.id, empresaId: empresa!.id, esSuperacceso: false };
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('Mediador sobre PostgreSQL', () => {
  it('la orden corre en la misma transacción del que la envía (se une, no abre otra)', async () => {
    const mediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
    let transaccionEnElManejador: unknown;
    // «empresas» es esencial: siempre está activo, sin necesidad de contratarlo.
    mediador.atender('empresas', 'prueba.registrar_acceso', async ({ recurso }, quienEnvia) => {
      await unidadDeTrabajo.ejecutar(quienEnvia, async () => {
        transaccionEnElManejador = transaccionEnCurso();
        await registrarAcceso(quienEnvia, recurso);
      });
    });

    const transaccionExterna = await unidadDeTrabajo.ejecutar(operador, async () => {
      await mediador.enviar(operador, 'prueba.registrar_acceso', { recurso: 'desde-la-orden' });
      return transaccionEnCurso();
    });

    expect(transaccionEnElManejador).toBe(transaccionExterna);
    const guardados = await unidadDeTrabajo.ejecutar(operador, recursosGuardados);
    expect(guardados).toContain('desde-la-orden');
  });

  it('si la orden falla, se deshace también lo que el que envía ya había escrito', async () => {
    const otroMediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
    otroMediador.atender('empresas', 'prueba.registrar_acceso', async () => {
      throw new FalloProvocado();
    });

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await registrarAcceso(operador, 'antes-de-la-orden-que-falla');
      await otroMediador.enviar(operador, 'prueba.registrar_acceso', { recurso: 'no-debe-quedar' });
    });

    await expect(operacion).rejects.toThrow(FalloProvocado);
    const guardados = await unidadDeTrabajo.ejecutar(operador, recursosGuardados);
    expect(guardados).not.toContain('antes-de-la-orden-que-falla');
    expect(guardados).not.toContain('no-debe-quedar');
  });

  it('si un aviso es rechazado, se deshace toda la operación del que avisó', async () => {
    const otroMediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
    otroMediador.escuchar('empresas', 'prueba.avisar_de_registro', async () => {
      throw new FalloProvocado();
    });

    const operacion = unidadDeTrabajo.ejecutar(operador, async () => {
      await registrarAcceso(operador, 'antes-del-aviso-rechazado');
      await otroMediador.avisar(operador, 'prueba.avisar_de_registro', { recurso: 'lo que sea' });
    });

    await expect(operacion).rejects.toThrow(FalloProvocado);
    const guardados = await unidadDeTrabajo.ejecutar(operador, recursosGuardados);
    expect(guardados).not.toContain('antes-del-aviso-rechazado');
  });

  it('si todo sale bien, queda todo guardado', async () => {
    const otroMediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
    otroMediador.atender(
      'empresas',
      'prueba.registrar_acceso',
      async ({ recurso }, quienEnvia) => void (await registrarAcceso(quienEnvia, recurso)),
    );

    await unidadDeTrabajo.ejecutar(operador, async () => {
      await registrarAcceso(operador, 'de-antes');
      await otroMediador.enviar(operador, 'prueba.registrar_acceso', { recurso: 'de-la-orden' });
    });

    const guardados = await unidadDeTrabajo.ejecutar(operador, recursosGuardados);
    expect(guardados).toEqual(expect.arrayContaining(['de-antes', 'de-la-orden']));
  });

  it('rechaza una orden para un módulo que no está activo en la cuenta', async () => {
    const otroMediador = new Mediador({ modulosActivos: new ModulosActivosDeLaCuentaEnRegistro() });
    otroMediador.atender('modulo-inexistente', 'prueba.registrar_acceso', async () => undefined);

    await expect(
      unidadDeTrabajo.ejecutar(operador, () =>
        otroMediador.enviar(operador, 'prueba.registrar_acceso', { recurso: 'x' }),
      ),
    ).rejects.toThrow(ModuloNoDisponible);
  });
});
