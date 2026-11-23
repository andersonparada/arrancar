import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { TipoDeParcelaInvalido } from '../../../dominio/tipo-de-parcela.js';
import { TIPOS_DE_PARCELA_INICIALES } from '../../../dominio/tipos-de-parcela-iniciales.js';
import { TiposDeParcelaEnMemoria } from '../../../pruebas/dobles-de-tipos-de-parcela.js';
import type { SolicitudDeTipoDeParcela } from '../../dto/tipo-de-parcela.dto.js';
import { ActualizarTipoDeParcela } from './actualizar-tipo-de-parcela.js';
import { CrearTipoDeParcela } from './crear-tipo-de-parcela.js';
import { EliminarTipoDeParcela } from './eliminar-tipo-de-parcela.js';
import { ListarTiposDeParcela } from './listar-tipos-de-parcela.js';
import { ObtenerTipoDeParcela } from './obtener-tipo-de-parcela.js';
import { SembrarTiposDeParcela } from './sembrar-tipos-de-parcela.js';

const operador = operadorDePrueba();

const solicitud = (cambios: Partial<SolicitudDeTipoDeParcela> = {}): SolicitudDeTipoDeParcela => ({
  nombre: 'Registro de prueba',
  activo: true,
  ...cambios,
});

let auditoria: AuditoriaEnMemoria;

function casosDeUso() {
  const registros = new TiposDeParcelaEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
  };
  return {
    listar: new ListarTiposDeParcela(dependencias),
    obtener: new ObtenerTipoDeParcela(dependencias),
    crear: new CrearTipoDeParcela(dependencias),
    actualizar: new ActualizarTipoDeParcela(dependencias),
    eliminar: new EliminarTipoDeParcela(dependencias),
    sembrar: new SembrarTiposDeParcela(registros),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('tipos de parcela', () => {
  it('registra un tipo de parcela y aparece en la lista', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador)).toEqual([creado]);
  });

  it('cambia sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const cambiado = await casos.actualizar.ejecutar(operador, {
      tipoDeParcelaId: creado.id,
      solicitud: solicitud({ nombre: 'Registro cambiado' }),
    });

    expect(cambiado.nombre).toBe('Registro cambiado');
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });

  it('no se registra sin "Nombre"', async () => {
    const invalido = casos.crear.ejecutar(operador, solicitud({ nombre: '  ' }));

    await expect(invalido).rejects.toThrow(TipoDeParcelaInvalido);
  });

  it('se inactiva sin perder sus datos', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.actualizar.ejecutar(operador, {
      tipoDeParcelaId: creado.id,
      solicitud: solicitud({ activo: false }),
    });

    expect(inactivo).toEqual({ ...creado, activo: false });
    expect(auditoria.acciones()).toEqual(['parcelas.tipos-de-parcela:inactivar']);
  });

  it('la primera vez que se lista, se siembran los tipos sugeridos; después la empresa manda', async () => {
    const primera = await casos.listar.ejecutar(operador);
    const [potrero] = primera;
    await casos.eliminar.ejecutar(operador, potrero!.id);
    await casos.sembrar.ejecutar(operador);

    expect(primera.map(({ nombre }) => nombre).sort()).toEqual([...TIPOS_DE_PARCELA_INICIALES].sort());
    expect(await casos.listar.ejecutar(operador)).toHaveLength(TIPOS_DE_PARCELA_INICIALES.length - 1);
  });

  it('se elimina y queda en la auditoría con cómo estaba', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, creado.id);

    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.acciones()).toEqual(['parcelas.tipos-de-parcela:eliminar']);
  });
});
