import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { correlativos } from './persistencia/correlativos.tablas.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresaUsuarios, empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import {
  ConsultaFueraDeUnidadDeTrabajo,
  EmpresaNoEsNueva,
  EmpresaNuevaYaEnCurso,
  UnidadDeTrabajoPostgres,
  despuesDeConfirmar,
  siSeDeshace,
  transaccionEnCurso,
} from './unidad-de-trabajo-postgres.js';
import { bdPropietario } from '../../base-datos/sembrado-de-prueba.soporte.js';

const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
let enEmpresaA: ContextoEmpresa;
let enEmpresaB: ContextoEmpresa;
let empresaDeOtraCuentaId: string;

class FalloProvocado extends Error {}

function registrarAcceso(contexto: ContextoEmpresa, recurso: string) {
  return transaccionEnCurso().insert(correlativos).values({ empresaId: contexto.empresaId, clave: recurso });
}

async function cuentaAjenaId(): Promise<string> {
  const [ajena] = await bd
    .select({ cuentaId: empresas.cuentaId })
    .from(empresas)
    .where(eq(empresas.id, empresaDeOtraCuentaId));
  return ajena!.cuentaId;
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
  const [a, b] = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A' },
      { cuentaId: cuenta!.id, nombre: 'Empresa B' },
    ])
    .returning();
  const [otraCuenta] = await bd.insert(cuentas).values({ nombre: 'Otra cuenta' }).returning();
  const [ajena] = await bdPropietario
    .insert(empresas)
    .values({ cuentaId: otraCuenta!.id, nombre: 'Empresa ajena' })
    .returning();
  empresaDeOtraCuentaId = ajena!.id;
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

  /** Inserta la empresa con la transacción de afuera, como hace `RegistrarEmpresa`. */
  function crear(nueva: ContextoEmpresa, nombre: string) {
    return transaccionEnCurso().insert(empresas).values({ id: nueva.empresaId, cuentaId: nueva.cuentaId, nombre });
  }

  /** Abre la empresa (que se crea antes, afuera) y deja un dato suyo. */
  async function abrirYSembrar(
    nueva: ContextoEmpresa,
    clave: string,
    despues?: () => Promise<void>,
  ): Promise<string[]> {
    await crear(nueva, clave);
    return unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva.empresaId, async () => {
      await registrarAcceso(nueva, clave);
      await despues?.();
      return recursosVisibles();
    });
  }

  it('ve la empresa nueva dentro y vuelve a la anterior al terminar, en la misma transacción', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const [dentro, despues] = await unidadDeTrabajo.ejecutar(enEmpresaA, async () => [
      await abrirYSembrar(nueva, 'de-nueva'),
      await recursosVisibles(),
    ]);

    expect(dentro).toEqual(['de-nueva']);
    expect(despues).toEqual(['de-a']);
  });

  it('crear dos empresas en un mismo libro es todo o nada', async () => {
    const [primera, segunda] = [nuevaDe(enEmpresaA), nuevaDe(enEmpresaA)];
    const libro = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await abrirYSembrar(primera, 'primera');
      await abrirYSembrar(segunda, 'segunda', async () => {
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
      await abrirYSembrar(primera, 'primera');
      await abrirYSembrar(segunda, 'segunda');
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
        .aislar(() =>
          abrirYSembrar(nueva, 'fallida', async () => {
            throw new FalloProvocado();
          }),
        )
        .catch(() => undefined);
      return recursosVisibles();
    });

    expect(resultado).toEqual(['de-a']);
  });

  it('rechaza una empresa que ya existía en la cuenta, con o sin acceso del usuario', async () => {
    const existente = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaB.empresaId, recursosVisibles),
    );
    const propia = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaA.empresaId, recursosVisibles),
    );

    await expect(existente).rejects.toThrow(EmpresaNoEsNueva);
    await expect(propia).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza abrir dos veces la misma empresa nueva en una transacción', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const repetida = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await abrirYSembrar(nueva, 'repetida');
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(nueva.empresaId, async () => undefined);
    });

    await expect(repetida).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza una empresa de otra cuenta', async () => {
    const ajena = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(empresaDeOtraCuentaId, async () => undefined),
    );

    await expect(ajena).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza una empresa existente de la cuenta aunque el usuario tenga acceso real a ella', async () => {
    await bdPropietario
      .insert(empresaUsuarios)
      .values({ empresaId: enEmpresaB.empresaId, usuarioId: enEmpresaA.usuarioId });
    const conAcceso = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(enEmpresaB.empresaId, recursosVisibles),
    );

    await expect(conAcceso).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza una empresa que no se creó antes, sin cambiar de empresa', async () => {
    const sinCrear = unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      unidadDeTrabajo.ejecutarEnEmpresaNueva(randomUUID(), async () => undefined),
    );

    await expect(sinCrear).rejects.toThrow(EmpresaNoEsNueva);
  });

  it('rechaza una empresa creada en otra cuenta, sin entrar a ella', async () => {
    const id = randomUUID();
    let entro = false;
    const enOtraCuenta = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await crear({ ...enEmpresaA, empresaId: id, cuentaId: await cuentaAjenaId() }, 'x');
      await unidadDeTrabajo.ejecutarEnEmpresaNueva(id, async () => void (entro = true));
    });

    await expect(enOtraCuenta).rejects.toThrow(EmpresaNoEsNueva);
    expect(entro).toBe(false);
  });

  it('rechaza una segunda empresa nueva mientras otra sigue abierta (llamadas en paralelo)', async () => {
    const [primera, segunda] = [nuevaDe(enEmpresaA), nuevaDe(enEmpresaA)];
    const paralelas = unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await crear(primera, 'primera');
      await crear(segunda, 'segunda');
      const resultados = await Promise.allSettled([
        unidadDeTrabajo.ejecutarEnEmpresaNueva(primera.empresaId, () => registrarAcceso(primera, 'p')),
        unidadDeTrabajo.ejecutarEnEmpresaNueva(segunda.empresaId, () => registrarAcceso(segunda, 's')),
      ]);
      const rechazo = resultados.find((resultado) => resultado.status === 'rejected');
      if (rechazo) throw rechazo.reason;
    });

    await expect(paralelas).rejects.toThrow(EmpresaNuevaYaEnCurso);
  });

  it('el momento de creación lo pone la base con su valor por omisión', () => {
    expect(empresas.creadoEn.hasDefault).toBe(true);
    expect(empresas.creadoEn.notNull).toBe(true);
  });

  it('en un punto de guardado que se deshace, las de confirmar se descartan y las de deshacer corren una sola vez', async () => {
    const corridas: string[] = [];
    await unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      despuesDeConfirmar(async () => void corridas.push('confirmar-afuera'));
      await unidadDeTrabajo
        .aislar(async () => {
          despuesDeConfirmar(async () => void corridas.push('confirmar-adentro'));
          siSeDeshace(async () => void corridas.push('deshacer-adentro'));
          throw new FalloProvocado();
        })
        .catch(() => undefined);
    });

    expect(corridas).toEqual(['deshacer-adentro', 'confirmar-afuera']);
  });

  it('las tareas de una empresa nueva que se deshace tampoco corren', async () => {
    const nueva = nuevaDe(enEmpresaA);
    const corridas: string[] = [];
    await unidadDeTrabajo.ejecutar(enEmpresaA, async () => {
      await abrirYSembrar(nueva, 'con-tareas', async () => {
        despuesDeConfirmar(async () => void corridas.push('confirmar-adentro'));
        throw new FalloProvocado();
      }).catch(() => undefined);
    });

    expect(corridas).toEqual([]);
  });

  it('core.empresas no tiene seguridad por filas: la comprobación debe ver todas las cuentas', async () => {
    const vistas = await unidadDeTrabajo.ejecutar(enEmpresaA, () =>
      transaccionEnCurso().select({ id: empresas.id }).from(empresas).where(eq(empresas.id, empresaDeOtraCuentaId)),
    );

    expect(vistas).toHaveLength(1);
  });

  it('sin transacción en curso falla: no abre una por su cuenta', async () => {
    const sola = unidadDeTrabajo.ejecutarEnEmpresaNueva(randomUUID(), async () => undefined);

    await expect(sola).rejects.toThrow(ConsultaFueraDeUnidadDeTrabajo);
  });
});
