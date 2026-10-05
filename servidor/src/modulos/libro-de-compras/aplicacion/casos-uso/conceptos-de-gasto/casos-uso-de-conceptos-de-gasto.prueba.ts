import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConceptoDeGastoInvalido } from '../../../dominio/concepto-de-gasto.js';
import { ConceptosDeGastoEnMemoria } from '../../../pruebas/dobles-de-conceptos-de-gasto.js';
import type { SolicitudDeConceptoDeGasto } from '../../dto/concepto-de-gasto.dto.js';
import { ActualizarConceptoDeGasto } from './actualizar-concepto-de-gasto.js';
import { CrearConceptoDeGasto } from './crear-concepto-de-gasto.js';
import { ListarConceptosDeGasto } from './listar-conceptos-de-gasto.js';
import { ObtenerConceptoDeGasto } from './obtener-concepto-de-gasto.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeConceptoDeGasto> = {}): SolicitudDeConceptoDeGasto => ({
  nombre: 'Registro de prueba',
  tipoPorOmision: 'bien',
  esProductoAgropecuario: false,
  esActivoFijo: false,
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new ConceptosDeGastoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarConceptosDeGasto(dependencias),
    obtener: new ObtenerConceptoDeGasto(dependencias),
    crear: new CrearConceptoDeGasto(dependencias),
    actualizar: new ActualizarConceptoDeGasto(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('conceptos de gasto', () => {
  it('registra un concepto de gasto y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      conceptoDeGastoId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(ConceptoDeGastoInvalido);
  });

  it('un activo fijo debe ser un bien', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ esActivoFijo: true, tipoPorOmision: 'servicio' }));

    await expect(invalido).rejects.toThrow(ConceptoDeGastoInvalido);
  });

  it('un activo fijo de tipo bien se registra', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud({ esActivoFijo: true }));

    expect(creado.esActivoFijo).toBe(true);
  });

  it('se reactiva y queda auditado', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud({ activo: false }));

    await casos.actualizar.ejecutar(operador, { conceptoDeGastoId: creado.id, solicitud: solicitud() });

    expect(auditoria.acciones()).toEqual(['libro-de-compras.conceptos-de-gasto:reactivar']);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      conceptoDeGastoId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['libro-de-compras.conceptos-de-gasto:inactivar']);
  });

  it('siembra la lista sugerida al abrir el catálogo vacío', async () => {
    const listado = await casos.listar.ejecutar(operador);

    expect(listado).toHaveLength(8);
    expect(listado.map((conceptoDeGasto) => conceptoDeGasto.nombre)).toEqual(
      expect.arrayContaining([
        'Combustibles',
        'Insumos agrícolas',
        'Alimento para ganado',
        'Medicinas veterinarias',
        'Reparaciones',
        'Servicios profesionales',
        'Energía eléctrica',
        'Maquinaria y equipo',
      ]),
    );
  });

  it('la lista sugerida no marca ningún concepto como agropecuario (los insumos son industrializados)', async () => {
    const listado = await casos.listar.ejecutar(operador);

    expect(listado.some((conceptoDeGasto) => conceptoDeGasto.esProductoAgropecuario)).toBe(false);
  });

  it('no vuelve a sembrar si ya tiene conceptos', async () => {
    await casos.crear.ejecutar(operador, solicitud());

    const listado = await casos.listar.ejecutar(operador);

    expect(listado).toHaveLength(1);
  });
});
