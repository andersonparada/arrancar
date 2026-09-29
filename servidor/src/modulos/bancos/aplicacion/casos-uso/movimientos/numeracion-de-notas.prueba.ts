import { beforeEach, describe, expect, it } from 'vitest';
import { CUENTA, armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

const saldoInicial = () =>
  nota({ saldoInicial: true, fecha: '2026-01-01', monto: '1000.00', referencia: null, tipo: 'credito' });

beforeEach(async () => {
  casos = armarEntorno();
  await casos.crear.ejecutar(operador, saldoInicial());
});

describe('numeración de notas', () => {
  it('las notas de crédito y de débito llevan cada una su propio consecutivo', async () => {
    const credito1 = await casos.crear.ejecutar(operador, nota({ tipo: 'credito' }));
    const debito1 = await casos.crear.ejecutar(operador, nota({ tipo: 'debito' }));
    const credito2 = await casos.crear.ejecutar(operador, nota({ tipo: 'credito' }));

    expect([credito1.numero, debito1.numero, credito2.numero]).toEqual([1, 1, 2]);
  });

  it('el saldo inicial no lleva número', async () => {
    const [inicial] = await casos.listar.ejecutar(operador, { clase: 'saldosIniciales' });

    expect(inicial).toMatchObject({ numero: null, anioDeNumero: 0 });
  });

  it('corregir una nota conserva su número', async () => {
    const creada = await casos.crear.ejecutar(operador, nota());

    const corregida = await casos.actualizar.ejecutar(operador, {
      movimientoId: creada.id,
      solicitud: nota({ monto: '30.00', fecha: '2026-02-10' }),
      esSaldoInicial: false,
    });

    expect(corregida.numero).toBe(creada.numero);
  });

  it('si al corregir cambia de tipo, toma el siguiente de su nuevo tipo y deja su auditoría', async () => {
    const credito = await casos.crear.ejecutar(operador, nota({ tipo: 'credito' }));
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito' }));

    const corregida = await casos.actualizar.ejecutar(operador, {
      movimientoId: credito.id,
      solicitud: nota({ tipo: 'debito' }),
      esSaldoInicial: false,
    });

    expect(corregida).toMatchObject({ tipo: 'debito', numero: 2 });
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({
        accion: 'corregir',
        anterior: expect.objectContaining({ tipo: 'credito', numero: 1 }),
      }),
    );
  });

  it('anular una nota crea un inverso con el siguiente número de su tipo', async () => {
    const credito = await casos.crear.ejecutar(operador, nota({ tipo: 'credito', monto: '40.00' }));
    await casos.anular.ejecutar(operador, { movimientoId: credito.id, motivo: 'Error', fecha: '2026-01-20' });

    const inverso = (await casos.listar.ejecutar(operador, { cuentaBancariaId: CUENTA })).find(
      (movimiento) => movimiento.revierteAId === credito.id,
    )!;

    expect(inverso).toMatchObject({ tipo: 'debito', numero: 1 });
    const otroDebito = await casos.crear.ejecutar(operador, nota({ tipo: 'debito' }));
    expect(otroDebito.numero).toBe(2);
  });

  it('eliminar una nota no reasigna su número: el siguiente sigue de largo', async () => {
    const primera = await casos.crear.ejecutar(operador, nota());
    await casos.eliminar.ejecutar(operador, { movimientoId: primera.id, motivo: 'Duplicada' });

    const segunda = await casos.crear.ejecutar(operador, nota());

    expect(segunda.numero).toBe(2);
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ accion: 'eliminar', anterior: expect.objectContaining({ numero: 1 }) }),
    );
  });
});
