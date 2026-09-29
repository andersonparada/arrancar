import { beforeEach, describe, expect, it } from 'vitest';
import { CONCEPTO_TRANSFERENCIA } from '../../../pruebas/conceptos-de-prueba.js';
import { armarEntorno, operador, solicitud } from './soporte-de-pruebas-de-transferencias.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

describe('el concepto de una transferencia', () => {
  it('las dos notas llevan el concepto de sistema «Transferencia entre cuentas», sin que nadie lo elija', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const notas = await casos.movimientos.listar({});
    const deLaTransferencia = notas.filter((n) => n.transferenciaId === registrada.id);
    expect(deLaTransferencia).toHaveLength(2);
    for (const nota of deLaTransferencia) {
      expect(nota).toMatchObject({ conceptoId: CONCEPTO_TRANSFERENCIA, conceptoNombre: 'Transferencia entre cuentas' });
    }
  });

  it('los dos inversos de una transferencia anulada llevan también el concepto de transferencia', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' });

    const inversos = (await casos.movimientos.listar({})).filter((n) => n.revierteAId !== null);
    expect(inversos).toHaveLength(2);
    for (const inverso of inversos) expect(inverso.conceptoId).toBe(CONCEPTO_TRANSFERENCIA);
  });
});
