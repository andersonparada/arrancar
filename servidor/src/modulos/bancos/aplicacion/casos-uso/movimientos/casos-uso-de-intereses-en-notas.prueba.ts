import { beforeEach, describe, expect, it } from 'vitest';
import {
  DatosDeInteresesNoAplican,
  DatosDeInteresesObligatorios,
  InteresesNoCuadran,
} from '../../../dominio/intereses.js';
import { CONCEPTO_DE_INTERESES, CONCEPTO_GENERAL } from '../../../pruebas/conceptos-de-prueba.js';
import { CUENTA, armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

beforeEach(() => {
  casos = armarEntorno({ permiteSobregiro: true });
});

/** Una nota de intereses: el monto es el neto (bruto 100.00 - ISR 10.00). */
const intereses = (cambios: Record<string, unknown> = {}) =>
  nota({ conceptoId: CONCEPTO_DE_INTERESES, monto: '90.00', interesBruto: '100.00', isrRetenido: '10.00', ...cambios });

describe('intereses con ISR retenido (H8)', () => {
  it('registra el bruto y el ISR con el neto como monto, y el DTO los trae', async () => {
    const creada = await casos.crear.ejecutar(operador, intereses());

    expect(creada).toMatchObject({ monto: '90.00', interesBruto: '100.00', isrRetenido: '10.00' });
    expect(await casos.registros.saldoDe(CUENTA)).toBe('90.00');
  });

  it('acepta un ISR de cero: el banco puede no haber retenido', async () => {
    const creada = await casos.crear.ejecutar(operador, intereses({ monto: '100.00', isrRetenido: '0.00' }));

    expect(creada).toMatchObject({ interesBruto: '100.00', isrRetenido: '0.00' });
  });

  it('si el concepto los pide, faltar uno de los dos es un error', async () => {
    await expect(casos.crear.ejecutar(operador, intereses({ interesBruto: null }))).rejects.toThrow(
      DatosDeInteresesObligatorios,
    );
    await expect(casos.crear.ejecutar(operador, intereses({ isrRetenido: undefined }))).rejects.toThrow(
      DatosDeInteresesObligatorios,
    );
  });

  it('exige que cuadre: bruto = monto + ISR, con centavos exactos', async () => {
    await expect(casos.crear.ejecutar(operador, intereses({ interesBruto: '100.01' }))).rejects.toThrow(
      InteresesNoCuadran,
    );
    await expect(
      casos.crear.ejecutar(operador, intereses({ isrRetenido: '-1.00', interesBruto: '89.00' })),
    ).rejects.toThrow(InteresesNoCuadran);
    const centavos = await casos.crear.ejecutar(
      operador,
      intereses({ monto: '0.30', interesBruto: '0.33', isrRetenido: '0.03' }),
    );
    expect(centavos.monto).toBe('0.30');
  });

  it('un concepto que no los pide no admite los datos', async () => {
    await expect(casos.crear.ejecutar(operador, nota({ conceptoId: CONCEPTO_GENERAL, ...datos() }))).rejects.toThrow(
      DatosDeInteresesNoAplican,
    );
  });

  it('corregir revisa lo mismo y puede completar los datos', async () => {
    const creada = await casos.crear.ejecutar(operador, nota({ conceptoId: CONCEPTO_GENERAL }));

    const corregida = await casos.actualizar.ejecutar(operador, {
      movimientoId: creada.id,
      solicitud: intereses({ monto: '100.00', isrRetenido: '0.00' }),
      esSaldoInicial: false,
    });

    expect(corregida).toMatchObject({ interesBruto: '100.00', isrRetenido: '0.00' });
    await expect(
      casos.actualizar.ejecutar(operador, {
        movimientoId: creada.id,
        solicitud: intereses({ interesBruto: '5.00' }),
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(InteresesNoCuadran);
  });

  it('el inverso de una anulación no copia los datos (es un débito)', async () => {
    const creada = await casos.crear.ejecutar(operador, intereses());

    await casos.anular.ejecutar(operador, { movimientoId: creada.id, motivo: 'Error', fecha: '2026-01-20' });

    const inverso = (await casos.registros.listar({ cuentaBancariaId: CUENTA })).find((m) => m.id !== creada.id)!;
    expect(inverso).toMatchObject({ tipo: 'debito', monto: '90.00', interesBruto: null, isrRetenido: null });
  });
});

const datos = () => ({ interesBruto: '10.00', isrRetenido: '0.00' });
