import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CombustibleInvalido } from '../../../dominio/combustible.js';
import { CombustiblesEnMemoria } from '../../../pruebas/dobles-de-combustibles.js';
import type { SolicitudDeCombustible } from '../../dto/combustible.dto.js';
import { ActualizarCombustible } from './actualizar-combustible.js';
import { CrearCombustible } from './crear-combustible.js';
import { ListarCombustibles } from './listar-combustibles.js';
import { ObtenerCombustible } from './obtener-combustible.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeCombustible> = {}): SolicitudDeCombustible => ({
  nombre: 'Registro de prueba',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new CombustiblesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarCombustibles(dependencias),
    obtener: new ObtenerCombustible(dependencias),
    crear: new CrearCombustible(dependencias),
    actualizar: new ActualizarCombustible(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('combustibles', () => {
  it('registra un combustible y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      combustibleId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(CombustibleInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      combustibleId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['libro-de-compras.combustibles:inactivar']);
  });
});
