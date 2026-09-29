import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { MesConciliado, SoloSeEliminaLaUltima } from '../../../dominio/errores.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  conciliarYAutorizar,
  CUENTA,
  inicio,
  marcarSaldoInicial,
  operador,
} from './soporte-de-pruebas-de-conciliaciones.js';

let entorno: ReturnType<typeof casosDeUsoDeConciliaciones>;

beforeEach(async () => {
  entorno = casosDeUsoDeConciliaciones();
  await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

describe('la regla del mes conciliado (se bloquea al autorizar)', () => {
  it('bloquea registrar con fecha en el mes autorizado o antes', async () => {
    await conciliarYAutorizar(entorno, 1, marcarSaldoInicial);

    await expect(
      entorno.casos.crearMovimiento.ejecutar(operador, {
        cuentaBancariaId: CUENTA,
        tipo: 'credito',
        fecha: '2026-01-20',
        monto: '10.00',
        saldoInicial: false,
        referencia: null,
        beneficiario: null,
        observaciones: null,
      }),
    ).rejects.toThrow(MesConciliado);
  });

  it('un movimiento conciliado sí se anula, pero el inverso no puede caer en el mes conciliado', async () => {
    const idAntiguo = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-05', monto: '20.00' });
    await conciliarYAutorizar(entorno, 1);

    await expect(
      entorno.casos.anularMovimiento.ejecutar(operador, {
        movimientoId: idAntiguo,
        motivo: 'x',
        fecha: '2026-01-20',
      }),
    ).rejects.toThrow(MesConciliado);

    const original = await entorno.casos.anularMovimiento.ejecutar(operador, {
      movimientoId: idAntiguo,
      motivo: 'x',
      fecha: '2026-02-01',
    });
    expect(original.revertidoEn).toEqual(expect.any(String));
  });

  it('no bloquea con fecha posterior al mes autorizado', async () => {
    await conciliarYAutorizar(entorno, 1);

    const movimiento = await entorno.casos.crearMovimiento.ejecutar(operador, {
      cuentaBancariaId: CUENTA,
      tipo: 'credito',
      fecha: '2026-02-01',
      monto: '10.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    expect(movimiento.fecha).toBe('2026-02-01');
  });
});

describe('eliminar', () => {
  it('solo elimina la última (en cualquier estado), suelta sus movimientos y audita', async () => {
    const enero = await conciliarYAutorizar(entorno, 1, marcarSaldoInicial);
    const febrero = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }));

    await expect(entorno.casos.eliminar.ejecutar(operador, { conciliacionId: enero, motivo: 'orden' })).rejects.toThrow(
      SoloSeEliminaLaUltima,
    );

    await entorno.casos.eliminar.ejecutar(operador, { conciliacionId: febrero.id, motivo: 'me equivoqué' });
    expect(entorno.auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.conciliaciones', registroId: febrero.id, accion: 'eliminar' }),
    );
    const lista = await entorno.casos.listar.ejecutar(operador, CUENTA);
    expect(lista.map((c) => c.id)).toEqual([enero]);

    // Reabre enero (autorizada): se puede volver a eliminar porque ahora es la última.
    await entorno.casos.eliminar.ejecutar(operador, { conciliacionId: enero, motivo: 'reabrir' });
    expect(await entorno.casos.listar.ejecutar(operador, CUENTA)).toHaveLength(0);
  });

  it('avisa si no existe', async () => {
    await expect(
      entorno.casos.eliminar.ejecutar(operador, { conciliacionId: randomUUID(), motivo: 'x' }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});
