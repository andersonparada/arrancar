import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  FechaDeReversionAnterior,
  MovimientoMarcadoEnConciliacion,
  MovimientoYaRevertido,
  NoEsUnaNota,
  NoSeEliminaUnInverso,
  NoSeEliminaUnMovimientoRevertido,
} from '../../../dominio/errores.js';
import { CUENTA, armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

beforeEach(() => {
  casos = armarEntorno();
});

describe('anular', () => {
  it('crea el inverso, marca el original revertido, lo deja en la auditoría y ya no se corrige', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    const original = await casos.anular.ejecutar(operador, {
      movimientoId: creado.id,
      motivo: '  Boleta duplicada ',
      fecha: '2026-01-20',
    });

    expect(original).toMatchObject({ revertidoEn: expect.any(String), motivoDeReversion: 'Boleta duplicada' });
    const todas = await casos.registros.listar({ cuentaBancariaId: CUENTA });
    const inverso = todas.find((m) => m.id !== creado.id)!;
    expect(inverso).toMatchObject({ tipo: 'debito', monto: '100.00', fecha: '2026-01-20', revierteAId: creado.id });
    expect(inverso.referencia).toContain('Reversión de');
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({
        registroId: creado.id,
        accion: 'anular',
        anterior: creado,
        motivo: 'Boleta duplicada',
      }),
    );
    expect(await casos.registros.saldoDe(CUENTA)).toBe('0.00');
    await expect(
      casos.actualizar.ejecutar(operador, { movimientoId: creado.id, solicitud: nota(), esSaldoInicial: false }),
    ).rejects.toThrow(MovimientoYaRevertido);
  });

  it('con bancos.anulaciones.misma_fecha, usa la fecha del original si su mes no está conciliado', async () => {
    casos = armarEntorno({ mismaFecha: true });
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));

    await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error' });

    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creado.id)!;
    expect(inverso.fecha).toBe('2026-01-05');
  });

  it('con misma_fecha pero el mes del original conciliado, usa la fecha que escribió el usuario', async () => {
    casos = armarEntorno({ mismaFecha: true });
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error', fecha: '2026-02-03' });

    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creado.id)!;
    expect(inverso.fecha).toBe('2026-02-03');
  });

  it('no acepta una fecha anterior a la del original', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));

    await expect(
      casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error', fecha: '2026-01-04' }),
    ).rejects.toThrow(FechaDeReversionAnterior);
  });

  it('una nota conciliada sí se anula (el inverso cae después del mes conciliado)', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.marcadosEnConciliacion.set(creado.id, randomUUID());
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    const original = await casos.anular.ejecutar(operador, {
      movimientoId: creado.id,
      motivo: 'Error',
      fecha: '2026-02-03',
    });

    expect(original.revertidoEn).toEqual(expect.any(String));
    expect(await casos.registros.saldoDe(CUENTA)).toBe('0.00');
  });

  it('no revierte con el inverso en un mes conciliado, ni un inverso, ni un movimiento ya revertido', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    await expect(
      casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error', fecha: '2026-01-20' }),
    ).rejects.toThrow();

    casos.registros.fechaConciliadaHasta = null;
    const original = await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error' });
    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creado.id)!;

    await expect(casos.anular.ejecutar(operador, { movimientoId: inverso.id, motivo: 'Otra vez' })).rejects.toThrow();
    await expect(casos.anular.ejecutar(operador, { movimientoId: original.id, motivo: 'Otra vez' })).rejects.toThrow(
      MovimientoYaRevertido,
    );
  });
});

describe('eliminar', () => {
  it('elimina de verdad una nota limpia y lo deja en la auditoría', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    await casos.eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'Duplicada por error' });

    await expect(casos.obtener.ejecutar(operador, creado.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({
        recurso: 'bancos.movimientos',
        registroId: creado.id,
        accion: 'eliminar',
        anterior: creado,
        motivo: 'Duplicada por error',
      }),
    );
  });

  it('no elimina un movimiento revertido ni su inverso', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());
    await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error' });
    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creado.id)!;

    await expect(casos.eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'x' })).rejects.toThrow(
      NoSeEliminaUnMovimientoRevertido,
    );
    await expect(casos.eliminar.ejecutar(operador, { movimientoId: inverso.id, motivo: 'x' })).rejects.toThrow(
      NoSeEliminaUnInverso,
    );
  });

  it('no elimina el saldo inicial desde notas', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(casos.eliminar.ejecutar(operador, { movimientoId: inicial.id, motivo: 'x' })).rejects.toThrow(
      NoEsUnaNota,
    );
  });

  it('no elimina un movimiento marcado en una conciliación', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());
    casos.registros.marcadosEnConciliacion.set(creado.id, randomUUID());

    await expect(casos.eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'x' })).rejects.toThrow(
      MovimientoMarcadoEnConciliacion,
    );
  });

  it('no elimina con fecha en un mes conciliado', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    await expect(casos.eliminar.ejecutar(operador, { movimientoId: creado.id, motivo: 'x' })).rejects.toThrow();
  });
});

describe('qué se puede hacer con una nota (lo calcula el servidor)', () => {
  it('limpia: se anula y se elimina', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    expect(creado).toMatchObject({ puedeAnular: true, puedeEliminar: true });
  });

  it('conciliada: se anula, pero no se elimina', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.marcadosEnConciliacion.set(creado.id, randomUUID());

    expect(await casos.obtener.ejecutar(operador, creado.id)).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('con fecha en un mes conciliado: se anula, pero no se elimina', async () => {
    const creado = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    expect(await casos.obtener.ejecutar(operador, creado.id)).toMatchObject({
      puedeAnular: true,
      puedeEliminar: false,
    });
  });

  it('revertida y su inverso: ni se anulan ni se eliminan', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    const original = await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: 'Error' });

    expect(original).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creado.id)!;
    expect(inverso).toMatchObject({ puedeAnular: false, puedeEliminar: false });
  });

  it('el saldo inicial no se anula; se elimina mientras la cuenta no tenga conciliaciones', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));
    expect(inicial).toMatchObject({ puedeAnular: false, puedeEliminar: true });

    casos.registros.fechaConciliadaHasta = '2026-01-31';

    expect(await casos.obtener.ejecutar(operador, inicial.id)).toMatchObject({ puedeEliminar: false });
  });
});
