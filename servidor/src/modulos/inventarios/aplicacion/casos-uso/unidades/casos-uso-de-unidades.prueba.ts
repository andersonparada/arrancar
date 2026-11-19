import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { UnidadEnUso } from '../../../dominio/errores.js';
import { UnidadInvalido } from '../../../dominio/unidad.js';
import { UNIDADES_SUGERIDAS } from '../../../dominio/unidades-iniciales.js';
import { UnidadesEnMemoria } from '../../../pruebas/dobles-de-unidades.js';
import type { SolicitudDeUnidad } from '../../dto/unidad.dto.js';
import { ActualizarUnidad } from './actualizar-unidad.js';
import { CrearUnidad } from './crear-unidad.js';
import { EliminarUnidad } from './eliminar-unidad.js';
import { ListarUnidades } from './listar-unidades.js';
import { ObtenerUnidad } from './obtener-unidad.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeUnidad> = {}): SolicitudDeUnidad => ({
  nombre: 'Quintal',
  simbolo: 'qq',
  magnitud: 'masa',
  factorALaReferencia: '100',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: UnidadesEnMemoria;

function casosDeUso() {
  registros = new UnidadesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarUnidades(dependencias),
    obtener: new ObtenerUnidad(dependencias),
    crear: new CrearUnidad(dependencias),
    actualizar: new ActualizarUnidad(dependencias),
    eliminar: new EliminarUnidad(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('unidades de medida', () => {
  it('registra una unidad de medida y aparece en la lista (sin sembrar la sugerida si ya hay una)', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('una empresa sin unidades recibe la lista sugerida al abrir el catálogo, y solo una vez', async () => {
    const primera = await casos.listar.ejecutar(operador);
    await casos.eliminar.ejecutar(operador, primera.find((unidad) => unidad.nombre === 'Caja')!.id);
    const segunda = await casos.listar.ejecutar(operador);

    expect(primera).toHaveLength(UNIDADES_SUGERIDAS.length);
    expect(segunda).toHaveLength(UNIDADES_SUGERIDAS.length - 1);
  });

  it('la lista sugerida trae el factor de las de masa, volumen y longitud y ninguno en las de empaque', async () => {
    const lista = await casos.listar.ejecutar(operador);
    const porNombre = new Map(lista.map((unidad) => [unidad.nombre, unidad]));

    expect(porNombre.get('Libra')?.factorALaReferencia).toBe('1');
    expect(porNombre.get('Quintal')?.factorALaReferencia).toBe('100');
    expect(porNombre.get('Caja')?.factorALaReferencia).toBeNull();
    expect(lista.every((unidad) => (unidad.magnitud === 'empaque' ? unidad.factorALaReferencia === null : true))).toBe(
      true,
    );
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      unidadId: creado.id,
      solicitud: solicitud({ nombre: 'Quintal grande', factorALaReferencia: '110' }),
    });

    expect(cambiado).toMatchObject({ nombre: 'Quintal grande', factorALaReferencia: '110' });
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin nombre ni símbolo', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }))).rejects.toThrow(UnidadInvalido);
    await expect(casos.crear.ejecutar(operador, solicitud({ simbolo: '' }))).rejects.toThrow(UnidadInvalido);
  });

  it('se inactiva sin perder sus datos y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      unidadId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['inventarios.unidades:inactivar']);
  });

  it('se elimina si nadie la usa y queda en la auditoría; si un artículo la usa, no', async () => {
    const libre = await casos.crear.ejecutar(operador, solicitud());
    const usada = await casos.crear.ejecutar(operador, solicitud({ nombre: 'Arroba', simbolo: '@' }));
    registros.ligadas.add(usada.id);

    await casos.eliminar.ejecutar(operador, libre.id);

    expect(auditoria.acciones()).toEqual(['inventarios.unidades:eliminar']);
    await expect(casos.eliminar.ejecutar(operador, usada.id)).rejects.toThrow(UnidadEnUso);
    await expect(casos.obtener.ejecutar(operador, libre.id)).rejects.toThrow(RecursoNoEncontrado);
  });
});
