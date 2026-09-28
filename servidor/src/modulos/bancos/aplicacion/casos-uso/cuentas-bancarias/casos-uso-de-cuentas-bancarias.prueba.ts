import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CuentaBancariaInvalido } from '../../../dominio/cuenta-bancaria.js';
import { CuentasBancariasEnMemoria } from '../../../pruebas/dobles-de-cuentas-bancarias.js';
import type { SolicitudDeCuentaBancaria } from '../../dto/cuenta-bancaria.dto.js';
import { ActualizarCuentaBancaria } from './actualizar-cuenta-bancaria.js';
import { CrearCuentaBancaria } from './crear-cuenta-bancaria.js';
import { ListarCuentasBancarias } from './listar-cuentas-bancarias.js';
import { ObtenerCuentaBancaria } from './obtener-cuenta-bancaria.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeCuentaBancaria> = {}): SolicitudDeCuentaBancaria => ({
  nombre: 'Registro de prueba',
  bancoId: '00000000-0000-4000-8000-000000000001',
  numero: 'Registro de prueba',
  tipo: 'monetaria',
  observaciones: 'Una nota de prueba.',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new CuentasBancariasEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarCuentasBancarias(dependencias),
    obtener: new ObtenerCuentaBancaria(dependencias),
    crear: new CrearCuentaBancaria(dependencias),
    actualizar: new ActualizarCuentaBancaria(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('cuentas bancarias', () => {
  it('registra una cuenta bancaria y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      cuentaBancariaId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado', numero: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre corto"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(CuentaBancariaInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      cuentaBancariaId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['bancos.cuentas-bancarias:inactivar']);
  });
});
