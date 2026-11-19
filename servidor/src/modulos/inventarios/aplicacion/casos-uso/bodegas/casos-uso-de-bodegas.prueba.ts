import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { type Bodega, BodegaInvalido } from '../../../dominio/bodega.js';
import { BodegasEnMemoria } from '../../../pruebas/dobles-de-bodegas.js';
import { UsoDelKardexEnMemoria } from '../../../pruebas/dobles-de-uso-del-kardex.js';
import { BodegaConExistencias } from '../../../dominio/errores.js';
import type { SolicitudDeBodega } from '../../dto/bodega.dto.js';
import type { ConsultasDeAccesosABodegas, UsuarioConAcceso } from '../../puertos/consultas-de-accesos-a-bodegas.js';
import { ActualizarBodega } from './actualizar-bodega.js';
import { CrearBodega } from './crear-bodega.js';
import { EliminarBodega } from './eliminar-bodega.js';
import { ListarBodegas } from './listar-bodegas.js';
import { ObtenerBodega } from './obtener-bodega.js';

const operador = operadorDePrueba();
const RESPONSABLE = randomUUID();

const solicitud = (cambios: Partial<SolicitudDeBodega> = {}): SolicitudDeBodega => ({
  codigo: 'bod-1',
  nombre: 'Bodega principal',
  localidadId: null,
  responsable: 'Pedro',
  responsableUsuarioId: null,
  activo: true,
  ...cambios,
});

/** Hace lo que los disparadores de la base de datos: asigna a quien crea la bodega y a su responsable. */
class AccesosEnMemoria extends BodegasEnMemoria implements ConsultasDeAccesosABodegas {
  readonly asignados = new Map<string, UsuarioConAcceso[]>();

  override async agregar(bodega: Bodega): Promise<void> {
    await super.agregar(bodega);
    this.dar(bodega, operador.usuarioId, 'creador');
    this.asignarAlResponsable(bodega);
  }

  override async guardar(bodega: Bodega): Promise<void> {
    await super.guardar(bodega);
    this.asignarAlResponsable(bodega);
  }

  async usuariosConAcceso(bodegaId: string): Promise<UsuarioConAcceso[]> {
    return this.asignados.get(bodegaId) ?? [];
  }

  private asignarAlResponsable(bodega: Bodega): void {
    const { responsableUsuarioId } = bodega.instantanea();
    if (responsableUsuarioId) this.dar(bodega, responsableUsuarioId, 'responsable');
  }

  private dar(bodega: Bodega, usuarioId: string, usuario: string): void {
    const actuales = this.asignados.get(bodega.id.valor) ?? [];
    if (actuales.some((a) => a.usuarioId === usuarioId)) return;
    this.asignados.set(bodega.id.valor, [...actuales, { usuarioId, usuario }]);
  }
}

let auditoria: AuditoriaEnMemoria;
let registros: AccesosEnMemoria;
let uso: UsoDelKardexEnMemoria;

function casosDeUso() {
  registros = new AccesosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  uso = new UsoDelKardexEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    accesos: registros,
    uso,
    auditoria,
  };
  return {
    listar: new ListarBodegas(dependencias),
    obtener: new ObtenerBodega(dependencias),
    crear: new CrearBodega(dependencias),
    actualizar: new ActualizarBodega(dependencias),
    eliminar: new EliminarBodega(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('bodegas', () => {
  it('registra una bodega con el código en mayúsculas y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(creado.codigo).toBe('BOD-1');
    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      bodegaId: creado.id,
      solicitud: solicitud({ codigo: 'BOD-2', nombre: 'Bodega de agroquímicos' }),
    });

    expect(cambiado).toMatchObject({ codigo: 'BOD-2', nombre: 'Bodega de agroquímicos' });
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin código ni con un código de forma inválida', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ codigo: '  ' }))).rejects.toThrow(BodegaInvalido);
    await expect(casos.crear.ejecutar(operador, solicitud({ codigo: 'bodega número uno' }))).rejects.toThrow(
      BodegaInvalido,
    );
  });

  it('con existencias no se inactiva; sin ellas sí', async () => {
    const casos = casosDeUso();
    const creado = await casos.crear.ejecutar(operador, solicitud());
    uso.bodegasConExistencias.add(creado.id);
    const inactivar = () =>
      casos.actualizar.ejecutar(operador, { bodegaId: creado.id, solicitud: solicitud({ activo: false }) });

    await expect(inactivar()).rejects.toBeInstanceOf(BodegaConExistencias);
    uso.bodegasConExistencias.clear();
    expect((await inactivar()).activo).toBe(false);
  });

  it('se inactiva sin perder sus datos y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      bodegaId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toContain('inventarios.bodegas:inactivar');
  });
});

describe('asignación al guardar', () => {
  it('quien la crea queda asignado y la asignación a sí mismo se audita', async () => {
    await casos.crear.ejecutar(operador, solicitud());

    expect(auditoria.acciones()).toEqual(['inventarios.accesos-a-bodegas:asignar']);
    expect(auditoria.entradas[0]?.anterior).toMatchObject({ codigo: 'BOD-1', aSiMismo: true });
  });

  it('el responsable con usuario recibe su acceso y también se audita', async () => {
    await casos.crear.ejecutar(operador, solicitud({ responsableUsuarioId: RESPONSABLE }));

    expect(auditoria.entradas.map((e) => e.anterior)).toMatchObject([
      { usuario: 'creador', aSiMismo: true },
      { usuarioId: RESPONSABLE, aSiMismo: false },
    ]);
  });

  it('un responsable nuevo al editar se asigna una sola vez', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    const cambio = { bodegaId: creado.id, solicitud: solicitud({ responsableUsuarioId: RESPONSABLE }) };
    await casos.actualizar.ejecutar(operador, cambio);
    await casos.actualizar.ejecutar(operador, cambio);

    expect(auditoria.acciones().filter((a) => a.endsWith(':asignar'))).toHaveLength(2);
  });

  it('al importar no se asigna a quien importa ni se audita', async () => {
    const creado = await casos.crear.ejecutar({ ...operador, sinAsignarAlCrear: true }, solicitud());

    expect(creado.localidadNombre).toBeNull();
    expect(auditoria.acciones()).toEqual([]);
  });
});

describe('eliminar', () => {
  it('deja en la auditoría la bodega y los usuarios que tenían acceso', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.listar.ejecutar(operador)).toEqual([]);
    const entrada = auditoria.entradas.at(-1);
    expect(entrada).toMatchObject({ recurso: 'inventarios.bodegas', accion: 'eliminar' });
    expect(entrada?.anterior).toMatchObject({ codigo: 'BOD-1', usuariosConAcceso: [{ usuario: 'creador' }] });
  });
});
