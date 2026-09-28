import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { BancoInvalido } from '../../../dominio/banco.js';
import { BancosEnMemoria } from '../../../pruebas/dobles-de-bancos.js';
import type { SolicitudDeBanco } from '../../dto/banco.dto.js';
import { ActualizarBanco } from './actualizar-banco.js';
import { CrearBanco } from './crear-banco.js';
import { ListarBancos } from './listar-bancos.js';
import { ObtenerBanco } from './obtener-banco.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeBanco> = {}): SolicitudDeBanco => ({
  nombre: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new BancosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarBancos(dependencias),
    obtener: new ObtenerBanco(dependencias),
    crear: new CrearBanco(dependencias),
    actualizar: new ActualizarBanco(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('bancos', () => {
  it('registra un banco y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      bancoId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(BancoInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      bancoId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['bancos.bancos:inactivar']);
  });
});
