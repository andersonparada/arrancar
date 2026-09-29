import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { LocalidadInvalido } from '../../../dominio/localidad.js';
import { AccesosALocalidadesEnMemoria, LocalidadesEnMemoria } from '../../../pruebas/dobles-de-localidades.js';
import type { SolicitudDeLocalidad } from '../../dto/localidad.dto.js';
import { ActualizarLocalidad } from './actualizar-localidad.js';
import { CrearLocalidad } from './crear-localidad.js';
import { EliminarLocalidad } from './eliminar-localidad.js';
import { ListarLocalidades } from './listar-localidades.js';
import { ObtenerLocalidad } from './obtener-localidad.js';

const operador = operadorDePrueba();
const creador = { usuarioId: operador.usuarioId, usuario: 'creador' };

const solicitud = (cambios: Partial<SolicitudDeLocalidad> = {}): SolicitudDeLocalidad => ({
  codigo: 'fin-01',
  nombre: 'Finca La Esperanza',
  tipoId: '00000000-0000-4000-8000-000000000001',
  codigoEstablecimientoSat: 7,
  nombreComercialSat: 'La Esperanza',
  departamentoCodigo: '01',
  municipioCodigo: '01',
  direccion: 'Km 10',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

/** `asignados` son los accesos que dejaría el disparador de la base de datos. */
function casosDeUso(asignados = [creador]) {
  const registros = new LocalidadesEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    accesos: new AccesosALocalidadesEnMemoria(asignados),
    auditoria,
  };
  return {
    listar: new ListarLocalidades(dependencias),
    obtener: new ObtenerLocalidad(dependencias),
    crear: new CrearLocalidad(dependencias),
    actualizar: new ActualizarLocalidad(dependencias),
    eliminar: new EliminarLocalidad(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('localidades', () => {
  it('registra una localidad y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('guarda el código interno en mayúsculas', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud({ codigo: ' fin-01 ' }));

    expect(creado.codigo).toBe('FIN-01');
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      localidadId: creado.id,
      solicitud: solicitud({ nombre: 'Finca Nueva' }),
    });

    expect(cambiado.nombre).toBe('Finca Nueva');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it.each([
    ['sin código interno', { codigo: '  ' }],
    ['con un código con espacios', { codigo: 'FIN 01' }],
    ['con un código de más de 12 caracteres', { codigo: 'FINCA-0000001' }],
    ['con un establecimiento SAT en cero', { codigoEstablecimientoSat: 0 }],
    ['con nombre comercial SAT sin establecimiento', { codigoEstablecimientoSat: null }],
    ['con departamento y sin municipio', { municipioCodigo: null }],
  ])('no se registra %s', async (_caso, cambios) => {
    await expect(casos.crear.ejecutar(operador, solicitud(cambios))).rejects.toThrow(LocalidadInvalido);
  });

  it('la asignación al creador queda en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(auditoria.entradas).toEqual([
      {
        recurso: 'empresas.accesos-a-localidades',
        registroId: creado.id,
        accion: 'asignar',
        anterior: {
          ...creador,
          localidadId: creado.id,
          codigo: 'FIN-01',
          nombre: 'Finca La Esperanza',
          aSiMismo: true,
        },
      },
    ]);
  });

  it('sin asignación no hay nada que auditar', async () => {
    casos = casosDeUso([]);

    await casos.crear.ejecutar(operador, solicitud());

    expect(auditoria.entradas).toEqual([]);
  });

  it('al importar no asigna, no audita y devuelve la localidad sin leerla', async () => {
    casos = casosDeUso([creador]);

    const creado = await casos.crear.ejecutar({ ...operador, sinAsignarAlCrear: true }, solicitud());

    expect(creado.codigo).toBe('FIN-01');
    expect(auditoria.entradas).toEqual([]);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      localidadId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toContain('empresas.localidades:inactivar');
  });

  it('se elimina y la auditoría guarda cómo estaba y quién tenía acceso', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    const baja = auditoria.entradas.at(-1);
    expect(baja).toMatchObject({ recurso: 'empresas.localidades', accion: 'eliminar', registroId: creado.id });
    expect(baja?.anterior).toEqual({ ...creado, usuariosConAcceso: [creador] });
    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no elimina lo que no existe', async () => {
    await expect(casos.eliminar.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});
