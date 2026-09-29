import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { DepartamentoInvalido } from '../../../dominio/departamento.js';
import { DepartamentosEnMemoria } from '../../../pruebas/dobles-de-departamentos.js';
import type { SolicitudDeDepartamento } from '../../dto/departamento.dto.js';
import { ActualizarDepartamento } from './actualizar-departamento.js';
import { CrearDepartamento } from './crear-departamento.js';
import { EliminarDepartamento } from './eliminar-departamento.js';
import { ListarDepartamentos } from './listar-departamentos.js';
import { ObtenerDepartamento } from './obtener-departamento.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeDepartamento> = {}): SolicitudDeDepartamento => ({
  codigo: 'DEP-01',
  nombre: 'Registro de prueba',
  localidadId: '00000000-0000-4000-8000-000000000001',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new DepartamentosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarDepartamentos(dependencias),
    obtener: new ObtenerDepartamento(dependencias),
    crear: new CrearDepartamento(dependencias),
    actualizar: new ActualizarDepartamento(dependencias),
    eliminar: new EliminarDepartamento(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('departamentos', () => {
  it('registra un departamento y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      departamentoId: creado.id,
      solicitud: solicitud({ codigo: 'DEP-02', nombre: 'Registro cambiado' }),
    });

    expect(cambiado.codigo).toBe('DEP-02');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Código interno"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ codigo: '  ' }));

    await expect(invalido).rejects.toThrow(DepartamentoInvalido);
  });

  it('se elimina y queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.listar.ejecutar(operador)).toEqual([]);
    expect(auditoria.acciones()).toEqual(['empresas.departamentos:eliminar']);
  });

  it('se reactiva dejando rastro', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud({ activo: false }));

    await casos.actualizar.ejecutar(operador, { departamentoId: creado.id, solicitud: solicitud() });

    expect(auditoria.acciones()).toEqual(['empresas.departamentos:reactivar']);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      departamentoId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['empresas.departamentos:inactivar']);
  });
});
