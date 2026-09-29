import { CONCEPTO_GENERAL } from '../../../pruebas/conceptos-de-prueba.js';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  FechaDeReversionAnterior,
  MesConciliado,
  MovimientoMarcadoEnConciliacion,
  SaldoInsuficiente,
  TransferenciaAnulada,
} from '../../../dominio/errores.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { DESTINO, ORIGEN, armarEntorno, operador, solicitud } from './soporte-de-pruebas-de-transferencias.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

describe('anular', () => {
  it('anula la transferencia y sus dos notas, y lo deja en la auditoría', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const anulada = await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Duplicada' });

    expect(anulada.anuladaEn).toEqual(expect.any(String));
    expect(await casos.movimientos.saldoDe(ORIGEN)).toBe('1000.00');
    expect(await casos.movimientos.saldoDe(DESTINO)).toBe('0.00');
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.transferencias', registroId: registrada.id, accion: 'anular' }),
    );
  });

  it('no se anula dos veces', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' });

    await expect(
      casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Otra vez' }),
    ).rejects.toThrow(TransferenciaAnulada);
  });

  it('si el destino queda negativo sin sobregiro, no se anula', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    const salidaEnElDestino = Movimiento.crear(Identificador.desde(operador.empresaId), {
      cuentaBancariaId: DESTINO,
      tipo: 'debito',
      fecha: '2026-01-16',
      monto: '80.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: CONCEPTO_GENERAL,
    });
    await casos.movimientos.agregar(salidaEnElDestino);

    await expect(casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' })).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('avisa si no existe', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('eliminar', () => {
  it('elimina la transferencia y sus dos notas si están limpias', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Duplicada' });

    await expect(casos.obtener.ejecutar(operador, registrada.id)).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.movimientos.obtener(registrada.movimientoOrigenId)).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.movimientos.obtener(registrada.movimientoDestinoId)).rejects.toThrow(RecursoNoEncontrado);
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.transferencias', registroId: registrada.id, accion: 'eliminar' }),
    );
  });

  it('no elimina una transferencia ya anulada (sus notas quedaron revertidas)', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' });

    await expect(casos.eliminar.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'x' })).rejects.toThrow();
  });
});

describe('anular con fecha', () => {
  it('los dos inversos llevan la fecha escrita, y no puede ser anterior a la transferencia', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-15' }));

    await expect(
      casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error', fecha: '2026-01-14' }),
    ).rejects.toThrow(FechaDeReversionAnterior);
    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error', fecha: '2026-01-20' });

    const inversos = (await casos.movimientos.listar({})).filter((m) => m.revierteAId !== null);
    expect(inversos.map((m) => [m.cuentaBancariaId, m.tipo, m.fecha])).toEqual([
      [ORIGEN, 'credito', '2026-01-20'],
      [DESTINO, 'debito', '2026-01-20'],
    ]);
  });

  it('con un mes conciliado en alguna cuenta, la fecha no puede caer ahí', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-15' }));
    casos.movimientos.fechaConciliadaHasta = '2026-01-31';

    await expect(
      casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error', fecha: '2026-01-20' }),
    ).rejects.toThrow(MesConciliado);
    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error', fecha: '2026-02-01' });
  });
});

describe('qué se puede hacer con una transferencia (lo calcula el servidor)', () => {
  it('recién registrada: se anula y se elimina', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    expect(registrada).toMatchObject({ puedeAnular: true, puedeEliminar: true });
  });

  it('con una nota marcada en una conciliación: se anula, pero no se elimina', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    casos.movimientos.marcadosEnConciliacion.set(registrada.movimientoOrigenId, randomUUID());

    expect(await casos.obtener.ejecutar(operador, registrada.id)).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
    await expect(casos.eliminar.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'x' })).rejects.toThrow(
      MovimientoMarcadoEnConciliacion,
    );
  });

  it('en un mes conciliado: se anula, pero no se elimina', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-15' }));
    casos.movimientos.fechaConciliadaHasta = '2026-01-31';

    expect(await casos.obtener.ejecutar(operador, registrada.id)).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('anulada: ni se anula ni se elimina', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const anulada = await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' });

    expect(anulada).toMatchObject({ puedeAnular: false, puedeEliminar: false });
  });
});
