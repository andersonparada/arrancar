import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { TipoDeLocalidadInvalido } from '../../../dominio/tipo-de-localidad.js';
import { TIPOS_DE_LOCALIDAD_INICIALES } from '../../../dominio/tipos-de-localidad-iniciales.js';
import { TiposDeLocalidadEnMemoria } from '../../../pruebas/dobles-de-tipos-de-localidad.js';
import type { SolicitudDeTipoDeLocalidad } from '../../dto/tipo-de-localidad.dto.js';
import { ActualizarTipoDeLocalidad } from './actualizar-tipo-de-localidad.js';
import { CrearTipoDeLocalidad } from './crear-tipo-de-localidad.js';
import { EliminarTipoDeLocalidad } from './eliminar-tipo-de-localidad.js';
import { ListarTiposDeLocalidad } from './listar-tipos-de-localidad.js';
import { ObtenerTipoDeLocalidad } from './obtener-tipo-de-localidad.js';
import { SembrarTiposDeLocalidad } from './sembrar-tipos-de-localidad.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeTipoDeLocalidad> = {}): SolicitudDeTipoDeLocalidad => ({
  nombre: 'Registro de prueba',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new TiposDeLocalidadEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarTiposDeLocalidad(dependencias),
    obtener: new ObtenerTipoDeLocalidad(dependencias),
    crear: new CrearTipoDeLocalidad(dependencias),
    actualizar: new ActualizarTipoDeLocalidad(dependencias),
    eliminar: new EliminarTipoDeLocalidad(dependencias),
    sembrar: new SembrarTiposDeLocalidad(registros),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('tipos de localidad', () => {
  it('registra un tipo de localidad y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('al listar una empresa sin tipos le siembra la lista sugerida, y una sola vez', async () => {
    const primera = await casos.listar.ejecutar(operador);
    const segunda = await casos.listar.ejecutar(operador);

    expect(primera.map((tipo) => tipo.nombre).sort()).toEqual([...TIPOS_DE_LOCALIDAD_INICIALES].sort());
    expect(primera.every((tipo) => tipo.activo)).toBe(true);
    expect(segunda).toEqual(primera);
  });

  it('no siembra si la empresa ya tiene tipos, aunque sean pocos', async () => {
    await casos.crear.ejecutar(operador, solicitud({ nombre: 'Rancho' }));

    await casos.sembrar.ejecutar(operador);

    expect((await casos.listar.ejecutar(operador)).map((tipo) => tipo.nombre)).toEqual(['Rancho']);
  });

  it('elimina un tipo y deja rastro en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    expect(await casos.obtener.ejecutar(operador, creado.id).catch((e) => e)).toBeInstanceOf(RecursoNoEncontrado);
    expect(auditoria.entradas).toEqual([
      { recurso: 'empresas.tipos-de-localidad', registroId: creado.id, accion: 'eliminar', anterior: creado },
    ]);
  });

  it('no elimina lo que no existe', async () => {
    await expect(casos.eliminar.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.entradas).toEqual([]);
  });

  it('no acepta un nombre de más de 60 caracteres y recorta los espacios', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ nombre: 'a'.repeat(61) }))).rejects.toThrow(
      TipoDeLocalidadInvalido,
    );
    expect((await casos.crear.ejecutar(operador, solicitud({ nombre: '  Finca  ' }))).nombre).toBe('Finca');
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      tipoDeLocalidadId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(TipoDeLocalidadInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      tipoDeLocalidadId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['empresas.tipos-de-localidad:inactivar']);
  });
});
