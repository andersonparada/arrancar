import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CategoriaInvalido } from '../../../dominio/categoria.js';
import { CategoriaEnUso } from '../../../dominio/errores.js';
import { CategoriasEnMemoria } from '../../../pruebas/dobles-de-categorias.js';
import type { SolicitudDeCategoria } from '../../dto/categoria.dto.js';
import { ActualizarCategoria } from './actualizar-categoria.js';
import { CrearCategoria } from './crear-categoria.js';
import { EliminarCategoria } from './eliminar-categoria.js';
import { ListarCategorias } from './listar-categorias.js';
import { ObtenerCategoria } from './obtener-categoria.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeCategoria> = {}): SolicitudDeCategoria => ({
  nombre: 'Registro de prueba',
  tipoDeInventarioPorOmision: 'mercaderia',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

let registros: CategoriasEnMemoria;

function casosDeUso() {
  registros = new CategoriasEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarCategorias(dependencias),
    obtener: new ObtenerCategoria(dependencias),
    crear: new CrearCategoria(dependencias),
    actualizar: new ActualizarCategoria(dependencias),
    eliminar: new EliminarCategoria(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('categorías', () => {
  it('registra una categoría y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      categoriaId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(CategoriaInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      categoriaId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['inventarios.categorias:inactivar']);
  });

  it('se elimina si no tiene artículos y queda en la auditoría; con artículos, no', async () => {
    const libre = await casos.crear.ejecutar(operador, solicitud());
    const usada = await casos.crear.ejecutar(operador, solicitud({ nombre: 'Con artículos' }));
    registros.ligadas.add(usada.id);

    await casos.eliminar.ejecutar(operador, libre.id);

    expect(auditoria.acciones()).toEqual(['inventarios.categorias:eliminar']);
    await expect(casos.eliminar.ejecutar(operador, usada.id)).rejects.toThrow(CategoriaEnUso);
  });
});
