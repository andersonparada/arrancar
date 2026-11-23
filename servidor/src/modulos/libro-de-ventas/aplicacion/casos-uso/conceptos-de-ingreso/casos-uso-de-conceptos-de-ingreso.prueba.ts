import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConceptoDeIngresoDeSistema, ConceptoDeIngresoInvalido } from '../../../dominio/concepto-de-ingreso.js';
import { ConceptoDeIngresoEnUso } from '../../../dominio/errores.js';
import { ConceptosDeIngresoEnMemoria } from '../../../pruebas/dobles-de-conceptos-de-ingreso.js';
import type { SolicitudDeConceptoDeIngreso } from '../../dto/concepto-de-ingreso.dto.js';
import { ActualizarConceptoDeIngreso } from './actualizar-concepto-de-ingreso.js';
import { CrearConceptoDeIngreso } from './crear-concepto-de-ingreso.js';
import { EliminarConceptoDeIngreso } from './eliminar-concepto-de-ingreso.js';
import { ListarConceptosDeIngreso } from './listar-conceptos-de-ingreso.js';
import { ObtenerConceptoDeIngreso } from './obtener-concepto-de-ingreso.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeConceptoDeIngreso> = {}): SolicitudDeConceptoDeIngreso => ({
  nombre: 'Registro de prueba',
  tipo: 'bien',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;
let registros: ConceptosDeIngresoEnMemoria;

function casosDeUso() {
  registros = new ConceptosDeIngresoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarConceptosDeIngreso(dependencias),
    obtener: new ObtenerConceptoDeIngreso(dependencias),
    crear: new CrearConceptoDeIngreso(dependencias),
    actualizar: new ActualizarConceptoDeIngreso(dependencias),
    eliminar: new EliminarConceptoDeIngreso(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('conceptos de ingreso', () => {
  it('registra un concepto de ingreso y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('la primera vez que se lista una empresa vacía se le siembran los cuatro conceptos, y no se repiten', async () => {
    const primera = await casos.listar.ejecutar(operador);
    const segunda = await casos.listar.ejecutar(operador);

    expect(primera.map((c) => c.nombre)).toEqual([
      'Otros ingresos',
      'Prestación de servicios',
      'Venta de activo fijo',
      'Venta de bienes',
    ]);
    expect(segunda).toEqual(primera);
    expect(primera.filter((c) => c.claveDeSistema === 'venta_de_activo_fijo')).toHaveLength(1);
  });

  it('una empresa que ya tiene conceptos no recibe la semilla', async () => {
    await casos.crear.ejecutar(operador, solicitud({ nombre: 'Venta de ganado' }));

    expect((await casos.listar.ejecutar(operador)).map((c) => c.nombre)).toEqual(['Venta de ganado']);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      conceptoDeIngresoId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(ConceptoDeIngresoInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      conceptoDeIngresoId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['libro-de-ventas.conceptos-de-ingreso:inactivar']);
  });

  it('el concepto de sistema no se edita ni se inactiva ni se elimina', async () => {
    const sistema = (await casos.listar.ejecutar(operador)).find((c) => c.claveDeSistema)!;

    const inactivar = casos.actualizar.ejecutar(operador, {
      conceptoDeIngresoId: sistema.id,
      solicitud: solicitud({ nombre: sistema.nombre, activo: false }),
    });

    await expect(inactivar).rejects.toThrow(ConceptoDeIngresoDeSistema);
    await expect(casos.eliminar.ejecutar(operador, sistema.id)).rejects.toThrow(ConceptoDeIngresoDeSistema);
    expect(auditoria.acciones()).toEqual([]);
  });

  it('eliminar deja en la auditoría cómo estaba', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.acciones()).toEqual(['libro-de-ventas.conceptos-de-ingreso:eliminar']);
  });

  it('con líneas de documentos no se elimina: se inactiva', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    registros.enUsoPorLineas.add(creado.id);

    await expect(casos.eliminar.ejecutar(operador, creado.id)).rejects.toThrow(ConceptoDeIngresoEnUso);
    expect(await casos.obtener.ejecutar(operador, creado.id)).toEqual(creado);
  });
});
