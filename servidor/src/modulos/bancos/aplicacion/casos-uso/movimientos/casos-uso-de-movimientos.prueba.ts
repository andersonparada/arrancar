import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  CuentaBancariaInactiva,
  MovimientoAntesDelSaldoInicial,
  NoEsUnaNota,
  NoEsUnSaldoInicial,
  SaldoInicialNoEsElPrimero,
  SaldoInicialRepetido,
  SaldoInsuficiente,
} from '../../../dominio/errores.js';
import { CUENTA, armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

beforeEach(() => {
  casos = armarEntorno();
});

describe('registrar y corregir', () => {
  it('registra, lista filtrando por fechas y corrige sin cambiar de cuenta', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-03-01' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: creado.id,
      solicitud: nota({ referencia: 'Boleta 124', cuentaBancariaId: randomUUID() }),
      esSaldoInicial: false,
    });

    expect(await casos.listar.ejecutar(operador, { hasta: '2026-01-31' })).toEqual([corregido]);
    expect(corregido).toMatchObject({ referencia: 'Boleta 124', cuentaBancariaId: CUENTA });
  });

  it('no registra en una cuenta inactiva', async () => {
    casos.registros.cuentasInactivas.add(CUENTA);

    await expect(casos.crear.ejecutar(operador, nota())).rejects.toThrow(CuentaBancariaInactiva);
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('saldo inicial', () => {
  it('hay uno solo por cuenta y es el primero por fecha', async () => {
    await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(casos.crear.ejecutar(operador, nota({ saldoInicial: true }))).rejects.toThrow(SaldoInicialRepetido);
    await expect(casos.crear.ejecutar(operador, nota({ fecha: '2025-12-31' }))).rejects.toThrow(
      MovimientoAntesDelSaldoInicial,
    );
  });

  it('no puede quedar después de otro movimiento', async () => {
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-10' }));

    await expect(casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-02-01' }))).rejects.toThrow(
      SaldoInicialNoEsElPrimero,
    );
  });

  it('se puede corregir a sí mismo sin chocar consigo', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: inicial.id,
      solicitud: nota({ saldoInicial: true, fecha: '2025-12-31', monto: '250.00' }),
      esSaldoInicial: true,
    });

    expect(corregido.monto).toBe('250.00');
  });
});

describe('sobregiro', () => {
  it('sin permitirlo, un débito no deja el saldo negativo', async () => {
    await casos.crear.ejecutar(operador, nota({ monto: '100.10' }));
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '100.10' }));

    await expect(casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '0.01' }))).rejects.toThrow('Q -0.01');
  });

  it('al corregir cuenta solo la diferencia', async () => {
    await casos.crear.ejecutar(operador, nota({ monto: '100.00' }));
    const debito = await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '60.00' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: debito.id,
      solicitud: nota({ tipo: 'debito', monto: '100.00' }),
      esSaldoInicial: false,
    });

    expect(corregido.monto).toBe('100.00');
    await expect(
      casos.actualizar.ejecutar(operador, {
        movimientoId: debito.id,
        solicitud: nota({ tipo: 'debito', monto: '100.01' }),
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(SaldoInsuficiente);
  });

  it('anular un crédito también cuenta', async () => {
    const credito = await casos.crear.ejecutar(operador, nota());
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '50.00' }));

    await expect(casos.anular.ejecutar(operador, { movimientoId: credito.id, motivo: 'Error' })).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('si la empresa lo permite, el saldo puede quedar negativo', async () => {
    casos = armarEntorno({ permiteSobregiro: true });

    const debito = await casos.crear.ejecutar(operador, nota({ tipo: 'debito' }));

    expect(debito.tipo).toBe('debito');
    expect(await casos.registros.saldoDe(CUENTA)).toBe('-100.00');
  });
});

describe('exigirClase (una nota no se corrige ni se anula como saldo inicial, ni al revés)', () => {
  it('no deja corregir el saldo inicial desde el endpoint de notas', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(
      casos.actualizar.ejecutar(operador, { movimientoId: inicial.id, solicitud: nota(), esSaldoInicial: false }),
    ).rejects.toThrow(NoEsUnaNota);
  });

  it('no deja corregir una nota desde el endpoint de saldos iniciales', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    await expect(
      casos.actualizar.ejecutar(operador, { movimientoId: creado.id, solicitud: nota(), esSaldoInicial: true }),
    ).rejects.toThrow(NoEsUnSaldoInicial);
  });

  it('no deja anular el saldo inicial desde notas: se corrige o se elimina desde la cuenta', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(casos.anular.ejecutar(operador, { movimientoId: inicial.id, motivo: 'Error' })).rejects.toThrow(
      NoEsUnaNota,
    );
  });
});

describe('filtro por clase', () => {
  it('notas excluye el saldo inicial y saldosIniciales excluye las notas', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));
    const notaSuelta = await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-05' }));

    expect(await casos.listar.ejecutar(operador, { clase: 'notas' })).toEqual([notaSuelta]);
    expect(await casos.listar.ejecutar(operador, { clase: 'saldosIniciales' })).toEqual([inicial]);
  });
});

describe('reporte de movimientos', () => {
  it('sin cuenta, los tres saldos son null', async () => {
    await casos.crear.ejecutar(operador, nota());

    const reporte = await casos.reporte.ejecutar(operador, {});

    expect(reporte).toMatchObject({ saldoAnterior: null, saldoFinal: null });
    expect(reporte.filas.every((fila) => fila.saldo === null)).toBe(true);
  });

  it('con cuenta, arma el saldo anterior y el saldo corrido en orden ascendente', async () => {
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-01', monto: '1000.00' }));
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-15', monto: '100.00' }));
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito', fecha: '2026-01-20', monto: '50.00' }));

    const reporte = await casos.reporte.ejecutar(operador, { cuentaBancariaId: CUENTA, desde: '2026-01-10' });

    expect(reporte.saldoAnterior).toBe('1000.00');
    expect(reporte.filas.map((fila) => fila.saldo)).toEqual(['1100.00', '1050.00']);
    expect(reporte.saldoFinal).toBe('1050.00');
  });

  it('sin filtro desde, el saldo anterior es cero', async () => {
    await casos.crear.ejecutar(operador, nota({ monto: '300.00' }));

    const reporte = await casos.reporte.ejecutar(operador, { cuentaBancariaId: CUENTA });

    expect(reporte.saldoAnterior).toBe('0.00');
    expect(reporte.saldoFinal).toBe('300.00');
  });
});
