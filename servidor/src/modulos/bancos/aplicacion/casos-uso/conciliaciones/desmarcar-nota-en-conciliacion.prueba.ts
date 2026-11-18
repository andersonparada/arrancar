import { beforeEach, describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ConciliacionNoEstaEnProceso, MovimientoNoConciliable } from '../../../dominio/errores.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import { DesmarcarNotaEnConciliacion } from './desmarcar-nota-en-conciliacion.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  inicio,
  marcarSaldoInicial,
  operador,
  terminarConSaldo,
} from './soporte-de-pruebas-de-conciliaciones.js';

/** Un `DesmarcarNota` de mentira: guarda lo que le llega y devuelve una nota ya desmarcada. */
class DesmarcarNotaFalso {
  readonly recibidos: unknown[] = [];

  async ejecutar(_operador: unknown, solicitud: unknown): Promise<MovimientoDto> {
    this.recibidos.push(solicitud);
    return { marcadaParaCuentasPorPagar: false } as MovimientoDto;
  }
}

let entorno: ReturnType<typeof casosDeUsoDeConciliaciones>;
let desmarcarNota: DesmarcarNotaFalso;
let caso: DesmarcarNotaEnConciliacion;
let notaId = '';
let conciliacionId = '';

const solicitud = (cambios: Record<string, unknown> = {}) => ({
  conciliacionId,
  movimientoId: notaId,
  motivo: 'Sin factura al cierre',
  conceptoId: 'concepto',
  ...cambios,
});

beforeEach(async () => {
  entorno = casosDeUsoDeConciliaciones();
  desmarcarNota = new DesmarcarNotaFalso();
  caso = new DesmarcarNotaEnConciliacion({
    conciliaciones: {
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      repositorio: entorno.conciliaciones,
      consultas: entorno.conciliaciones,
    },
    desmarcarNota,
  });
  await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
  notaId = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '80.00', tipo: 'debito' });
  conciliacionId = (await entorno.casos.iniciar.ejecutar(operador, inicio())).id;
});

describe('DesmarcarNotaEnConciliacion', () => {
  it('con la conciliación en proceso y la nota como candidata, delega en desmarcar la nota', async () => {
    const respuesta = await caso.ejecutar(operador, solicitud());

    expect(respuesta.marcadaParaCuentasPorPagar).toBe(false);
    expect(desmarcarNota.recibidos).toEqual([
      { movimientoId: notaId, motivo: 'Sin factura al cierre', conceptoId: 'concepto' },
    ]);
  });

  it('rechaza una nota que no es candidata del mes, sin llegar a desmarcarla', async () => {
    const posterior = await agregarMovimiento(entorno.movimientos, {
      fecha: '2026-03-10',
      monto: '10.00',
      tipo: 'debito',
    });

    await expect(caso.ejecutar(operador, solicitud({ movimientoId: posterior }))).rejects.toThrow(
      MovimientoNoConciliable,
    );
    expect(desmarcarNota.recibidos).toEqual([]);
  });

  it('rechaza si la conciliación ya se elaboró', async () => {
    await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId,
      movimientoIds: marcarSaldoInicial((await entorno.casos.obtener.ejecutar(operador, conciliacionId)).candidatos),
    });
    await terminarConSaldo(entorno.casos, operador, conciliacionId);

    await expect(caso.ejecutar(operador, solicitud())).rejects.toThrow(ConciliacionNoEstaEnProceso);
    expect(desmarcarNota.recibidos).toEqual([]);
  });

  it('rechaza una conciliación que no existe', async () => {
    await expect(
      caso.ejecutar(operador, solicitud({ conciliacionId: '00000000-0000-4000-8000-0000000000aa' })),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});
