import { beforeEach, describe, expect, it } from 'vitest';
import { DESTINO, ORIGEN, armarEntorno, operador, solicitud } from './soporte-de-pruebas-de-transferencias.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

describe('numeración de transferencias', () => {
  it('cada transferencia lleva el siguiente número de la empresa', async () => {
    const primera = await casos.registrar.ejecutar(operador, solicitud());
    const segunda = await casos.registrar.ejecutar(operador, solicitud({ monto: '5.00' }));

    expect([primera.numero, segunda.numero]).toEqual([1, 2]);
  });

  it('sus dos notas no llevan número propio', async () => {
    await casos.registrar.ejecutar(operador, solicitud());

    const delDebito = await casos.movimientos.listar({ cuentaBancariaId: ORIGEN });
    const delCredito = await casos.movimientos.listar({ cuentaBancariaId: DESTINO });

    const notas = [...delDebito, ...delCredito].filter((movimiento) => movimiento.transferenciaId !== null);
    expect(notas).toHaveLength(2);
    expect(notas.map((nota) => nota.numero)).toEqual([null, null]);
  });

  it('anularla crea dos inversos sin número (el número va en la transferencia)', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Duplicada' });

    const inversos = (await casos.movimientos.listar({})).filter((movimiento) => movimiento.revierteAId !== null);
    expect(inversos).toHaveLength(2);
    expect(inversos.map((inverso) => inverso.numero)).toEqual([null, null]);
  });

  it('una transferencia rechazada no consume número', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ monto: '99999.00' }))).rejects.toThrow();

    const siguiente = await casos.registrar.ejecutar(operador, solicitud());

    expect(siguiente.numero).toBe(1);
  });
});
