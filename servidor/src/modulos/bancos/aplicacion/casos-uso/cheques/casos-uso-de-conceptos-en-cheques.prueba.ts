import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoInactivo,
  ConceptoIncompatible,
  ConceptoObligatorio,
} from '../../../dominio/errores-de-conceptos.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_INACTIVO,
  CONCEPTO_SIN_CLASIFICAR,
} from '../../../pruebas/conceptos-de-prueba.js';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

const emision = (cambios: Record<string, unknown> = {}) => emisionDe(casos.chequeId, cambios);

describe('el concepto de un cheque', () => {
  it('acepta un concepto de débito: el cheque cuenta como débito', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_DE_DEBITO }));

    expect(movimiento).toMatchObject({ conceptoId: CONCEPTO_DE_DEBITO, conceptoNombre: 'Comisiones bancarias' });
  });

  it('rechaza uno solo de crédito, uno de sistema como sin_clasificar, uno inactivo y la falta de concepto', async () => {
    const emitir = (conceptoId: string | undefined) =>
      casos.emitir.ejecutar(operador, emision({ conceptoId }) as never);

    await expect(emitir(CONCEPTO_DE_CREDITO)).rejects.toThrow(ConceptoIncompatible);
    await expect(emitir(CONCEPTO_SIN_CLASIFICAR)).rejects.toThrow(ConceptoDeSistemaNoSeElige);
    await expect(emitir(CONCEPTO_INACTIVO)).rejects.toThrow(ConceptoInactivo);
    await expect(emitir(undefined)).rejects.toThrow(ConceptoObligatorio);
  });

  it('al anular con el mes conciliado, la nota de crédito inversa hereda el concepto de débito del cheque', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_DE_DEBITO }));
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Nunca se cobró', fecha: '2026-03-05' });

    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find(
      (m) => m.revierteAId === movimiento.id,
    )!;
    expect(inverso).toMatchObject({ tipo: 'credito', conceptoId: CONCEPTO_DE_DEBITO });
  });

  it('un cheque anulado con el mes abierto conserva su concepto', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_DE_DEBITO }));

    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(await casos.movimientos.obtener(movimiento.id)).toMatchObject({ conceptoId: CONCEPTO_DE_DEBITO });
  });
});
