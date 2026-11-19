import { describe, expect, it, vi } from 'vitest';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../compartido/pruebas/dobles-compartidos.js';
import {
  ParametrosFijos,
  RepositorioDeCorreosEnMemoria,
  TareasEnLaTransaccion,
} from '../../pruebas/dobles-de-la-bandeja.js';
import { HistorialEnMemoria, correoDePrueba } from '../../pruebas/historial-en-memoria.js';
import { CupoDeCorreosAgotado } from '../../dominio/errores-de-la-bandeja.js';
import { CorreoNoPendiente, CorreoNoReintentable, CorreoSinContenido } from '../errores-del-historial.js';
import { CancelarCorreo } from './cancelar-correo.js';
import { ObtenerCorreo } from './obtener-correo.js';
import { ReintentarCorreo } from './reintentar-correo.js';

const operador = operadorDePrueba();

function preparar(...correos: ReturnType<typeof correoDePrueba>[]) {
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const historial = new HistorialEnMemoria(correos);
  const auditoria = new AuditoriaEnMemoria();
  const repositorio = new RepositorioDeCorreosEnMemoria();
  const tareas = new TareasEnLaTransaccion();
  const despertar = vi.fn();
  return { unidadDeTrabajo, historial, auditoria, repositorio, tareas, despertar };
}

describe('ObtenerCorreo', () => {
  it('trae la ficha dentro de la unidad de trabajo de la empresa', async () => {
    const { unidadDeTrabajo, historial } = preparar(correoDePrueba());

    const ficha = await new ObtenerCorreo({ unidadDeTrabajo, historial }).ejecutar(operador, 'correo-1');

    expect(ficha.id).toBe('correo-1');
    expect(unidadDeTrabajo.contextos).toHaveLength(1);
  });

  it('un correo inexistente no se encuentra', async () => {
    const { unidadDeTrabajo, historial } = preparar();

    await expect(new ObtenerCorreo({ unidadDeTrabajo, historial }).ejecutar(operador, 'x')).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
  });
});

describe('CancelarCorreo', () => {
  it('cancela un pendiente y audita con el motivo, sin el cuerpo', async () => {
    const { unidadDeTrabajo, historial, auditoria } = preparar(correoDePrueba());

    const cancelado = await new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }).ejecutar(
      operador,
      'correo-1',
      ' Pago anulado ',
    );

    expect(cancelado).toMatchObject({ estado: 'cancelado', motivoDeCancelacion: 'Pago anulado' });
    expect(auditoria.entradas).toHaveLength(1);
    expect(auditoria.entradas[0]).toMatchObject({
      recurso: 'core.correos_salientes',
      accion: 'anular',
      motivo: 'Pago anulado',
    });
    expect(JSON.stringify(auditoria.entradas[0]?.anterior)).not.toContain('Texto');
  });

  it.each(['enviado', 'enviando', 'fallido', 'cancelado'] as const)('no cancela uno %s', async (estado) => {
    const { unidadDeTrabajo, historial, auditoria } = preparar(correoDePrueba({ estado }));

    await expect(
      new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }).ejecutar(operador, 'correo-1', 'x'),
    ).rejects.toBeInstanceOf(CorreoNoPendiente);
    expect(auditoria.entradas).toHaveLength(0);
  });

  it('exige el motivo antes de abrir la unidad de trabajo', async () => {
    const { unidadDeTrabajo, historial, auditoria } = preparar(correoDePrueba());

    await expect(
      new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }).ejecutar(operador, 'correo-1', '  '),
    ).rejects.toMatchObject({ codigo: 'motivo_de_cancelacion_no_valido' });
    expect(unidadDeTrabajo.contextos).toHaveLength(0);
  });
});

describe('ReintentarCorreo', () => {
  const armar = (c: ReturnType<typeof preparar>) =>
    new ReintentarCorreo({
      unidadDeTrabajo: c.unidadDeTrabajo,
      historial: c.historial,
      repositorio: c.repositorio,
      parametros: new ParametrosFijos(),
      auditoria: c.auditoria,
      tareas: c.tareas,
      despertador: { despertar: c.despertar },
    });

  it('vuelve a poner un fallido en la bandeja, lo audita y despierta al trabajador al confirmar', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'fallido', intentos: 8 }));

    const reintentado = await armar(contexto).ejecutar(operador, 'correo-1');

    expect(reintentado).toMatchObject({ estado: 'pendiente', intentos: 0 });
    expect(contexto.auditoria.acciones()).toEqual(['core.correos_salientes:reabrir']);
    expect(contexto.despertar).not.toHaveBeenCalled();
    await contexto.tareas.confirmar();
    expect(contexto.despertar).toHaveBeenCalledOnce();
  });

  it('deja una marca del reintento por destinatario para que gaste cupo', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'fallido' }));

    await armar(contexto).ejecutar(operador, 'correo-1');

    expect(contexto.repositorio.reintentosMarcados).toEqual([{ correoId: 'correo-1', direcciones: ['a@ejemplo.com'] }]);
  });

  it('si no caben los cupos no deja marca', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'fallido' }));
    contexto.repositorio.uso = { porHora: 100, porDia: 0, deLaInstalacionPorHora: 0, porDestinatario: {} };

    await expect(armar(contexto).ejecutar(operador, 'correo-1')).rejects.toBeInstanceOf(CupoDeCorreosAgotado);
    expect(contexto.repositorio.reintentosMarcados).toHaveLength(0);
  });

  it('un fallido con el contenido depurado no se reintenta', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'fallido', contenidoDepurado: true, cuerpoTexto: null }));

    await expect(armar(contexto).ejecutar(operador, 'correo-1')).rejects.toBeInstanceOf(CorreoSinContenido);
  });

  it('solo se reintenta lo fallido', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'enviado' }));

    await expect(armar(contexto).ejecutar(operador, 'correo-1')).rejects.toBeInstanceOf(CorreoNoReintentable);
  });

  it('respeta los cupos y no cambia nada si no caben', async () => {
    const contexto = preparar(correoDePrueba({ estado: 'fallido' }));
    contexto.repositorio.uso = { porHora: 100, porDia: 0, deLaInstalacionPorHora: 0, porDestinatario: {} };

    await expect(armar(contexto).ejecutar(operador, 'correo-1')).rejects.toBeInstanceOf(CupoDeCorreosAgotado);
    expect(contexto.historial.correos[0]?.estado).toBe('fallido');
    expect(contexto.auditoria.entradas).toHaveLength(0);
  });
});
