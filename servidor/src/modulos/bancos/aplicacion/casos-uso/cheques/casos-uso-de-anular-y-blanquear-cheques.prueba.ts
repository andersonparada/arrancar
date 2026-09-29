import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { RelojEnZonaHoraria } from '../../../../core/compartido/infraestructura/reloj-en-zona-horaria.js';
import { ChequeAnulado, MesConciliado, MovimientoMarcadoEnConciliacion } from '../../../dominio/errores.js';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

const emision = (cambios: Record<string, unknown> = {}) => emisionDe(casos.chequeId, cambios);

describe('anular', () => {
  it('anula un cheque disponible sin tocar movimientos', async () => {
    const anulado = await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Roto' });

    expect(anulado.estado).toBe('anulado');
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('1000.00');
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.cheques', registroId: casos.chequeId, accion: 'anular' }),
    );
  });

  it('anula un cheque emitido y también su movimiento', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    const anulado = await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(anulado.estado).toBe('anulado');
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('1000.00');
    const notaAnulada = await casos.movimientos.obtener(movimiento.id);
    expect(notaAnulada.anuladoEn).toEqual(expect.any(String));
  });

  it('no se anula dos veces', async () => {
    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Roto' });

    await expect(casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Otra vez' })).rejects.toThrow(
      ChequeAnulado,
    );
  });

  it('avisa si no existe', async () => {
    await expect(casos.anular.ejecutar(operador, { chequeId: randomUUID(), motivo: 'Error' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });

  it('con el mes conciliado, crea la nota inversa en vez de anular el movimiento a la antigua', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    const anulado = await casos.anular.ejecutar(operador, {
      chequeId: casos.chequeId,
      motivo: 'Nunca se cobró',
      fecha: '2026-03-05',
    });

    expect(anulado.estado).toBe('anulado');
    const original = await casos.movimientos.obtener(movimiento.id);
    expect(original.anuladoEn).toBeNull();
    expect(original.revertidoEn).toEqual(expect.any(String));
    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== movimiento.id)!;
    expect(inverso).toMatchObject({
      tipo: 'credito',
      monto: '100.00',
      fecha: '2026-03-05',
      revierteAId: movimiento.id,
    });
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('1000.00');
  });
});

describe('blanquear', () => {
  it('el cheque vuelve a disponible y su movimiento se elimina', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    const blanqueado = await casos.blanquear.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(blanqueado).toMatchObject({ estado: 'disponible', movimientoId: null });
    await expect(casos.movimientos.obtener(movimiento.id)).rejects.toThrow(RecursoNoEncontrado);
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('1000.00');
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.cheques', registroId: casos.chequeId, accion: 'blanquear' }),
    );
    const siguiente = await casos.siguiente.ejecutar(operador, CUENTA);
    expect(siguiente?.numero).toBe(1);
  });

  it('no blanquea un cheque que no está emitido', async () => {
    await expect(casos.blanquear.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' })).rejects.toThrow();
  });

  it('no blanquea si el mes ya está conciliado', async () => {
    await casos.emitir.ejecutar(operador, emision());
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    await expect(casos.blanquear.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' })).rejects.toThrow();
  });
});

describe('con el mes conciliado, el inverso tampoco puede caer en un mes conciliado', () => {
  it('rechaza la fecha de la anulación si está dentro del mes conciliado', async () => {
    await casos.emitir.ejecutar(operador, emision());
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    await expect(
      casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Nunca se cobró', fecha: '2026-02-20' }),
    ).rejects.toThrow(MesConciliado);
  });

  it('sin fecha escrita, usa la de hoy', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ fecha: '2026-01-10' }));
    casos.movimientos.fechaConciliadaHasta = '2026-01-31';

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Nunca se cobró' });

    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find(
      (m) => m.revierteAId === movimiento.id,
    )!;
    expect(inverso.fecha).toBe('2026-09-29');
  });

  it('a las 20:00 de Guatemala, hoy sigue siendo el mismo día aunque en UTC ya sea el siguiente', async () => {
    const veinteHoras = () => new Date('2026-09-30T02:00:00Z');
    const reloj = new RelojEnZonaHoraria({ zonaHoraria: async () => 'America/Guatemala' }, veinteHoras);
    casos = await armarEntorno({ reloj });
    const movimiento = await casos.emitir.ejecutar(operador, emision({ fecha: '2026-01-10' }));
    casos.movimientos.fechaConciliadaHasta = '2026-01-31';

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Nunca se cobró' });

    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find(
      (m) => m.revierteAId === movimiento.id,
    )!;
    expect(inverso.fecha).toBe('2026-09-29');
  });
});

describe('qué se puede hacer con un cheque (lo calcula el servidor)', () => {
  it('disponible: se anula, no se blanquea', async () => {
    const cheque = await casos.cheques.obtener(casos.chequeId);

    expect(cheque).toMatchObject({ puedeAnular: true, puedeBlanquear: false });
  });

  it('emitido y limpio: se anula y se blanquea', async () => {
    await casos.emitir.ejecutar(operador, emision());

    expect(await casos.cheques.obtener(casos.chequeId)).toMatchObject({ puedeAnular: true, puedeBlanquear: true });
  });

  it('emitido en un mes conciliado: se anula, pero ya no se blanquea', async () => {
    await casos.emitir.ejecutar(operador, emision());
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    expect(await casos.cheques.obtener(casos.chequeId)).toMatchObject({ puedeAnular: true, puedeBlanquear: false });
  });

  it('emitido y marcado en una conciliación: no se blanquea', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());
    casos.movimientos.marcadosEnConciliacion.set(movimiento.id, randomUUID());

    expect(await casos.cheques.obtener(casos.chequeId)).toMatchObject({ puedeBlanquear: false });
    await expect(casos.blanquear.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' })).rejects.toThrow(
      MovimientoMarcadoEnConciliacion,
    );
  });

  it('anulado: no se anula ni se blanquea, y aparece así en la lista de la empresa', async () => {
    await casos.emitir.ejecutar(operador, emision());
    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(await casos.cheques.obtener(casos.chequeId)).toMatchObject({ puedeAnular: false, puedeBlanquear: false });
    const [listado] = await casos.listar.ejecutar(operador, {});
    expect(listado).toMatchObject({ estado: 'anulado', puedeAnular: false, puedeBlanquear: false });
  });
});
