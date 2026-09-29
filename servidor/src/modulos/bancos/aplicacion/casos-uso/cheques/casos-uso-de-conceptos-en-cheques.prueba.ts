import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoInactivo,
  ConceptoIncompatible,
  ConceptoObligatorio,
  PagoAProveedoresLoFijaCuentasPorPagar,
} from '../../../dominio/errores-de-conceptos.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_INACTIVO,
  CONCEPTO_SIN_CLASIFICAR,
  idDeSistema,
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

describe('«Pago a proveedores» en un cheque manual (P3)', () => {
  const PAGO_A_PROVEEDOR = idDeSistema('pago_a_proveedor');

  it('sin Cuentas por pagar activo, se puede elegir', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ conceptoId: PAGO_A_PROVEEDOR }));

    expect(movimiento).toMatchObject({ conceptoId: PAGO_A_PROVEEDOR, conceptoNombre: 'Pago a proveedores' });
  });

  it('con Cuentas por pagar activo, lo fija ese módulo y el cheque manual lo rechaza', async () => {
    const conModulo = await armarEntorno({ cuentasPorPagarActivo: true });

    await expect(
      conModulo.emitir.ejecutar(operador, emisionDe(conModulo.chequeId, { conceptoId: PAGO_A_PROVEEDOR })),
    ).rejects.toThrow(PagoAProveedoresLoFijaCuentasPorPagar);
    const conConceptoPropio = await conModulo.emitir.ejecutar(
      operador,
      emisionDe(conModulo.chequeId, { conceptoId: CONCEPTO_DE_DEBITO }),
    );
    expect(conConceptoPropio.conceptoId).toBe(CONCEPTO_DE_DEBITO);
  });

  it('el resto de los de sistema sigue sin poder elegirse aunque no haya Cuentas por pagar', async () => {
    await expect(casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_SIN_CLASIFICAR }))).rejects.toThrow(
      ConceptoDeSistemaNoSeElige,
    );
  });
});

describe('la causa de anulación de un cheque (P1)', () => {
  it('anular a mano deja la causa manual', async () => {
    await casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_DE_DEBITO }));

    const anulado = await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(anulado).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'manual' });
  });

  it('por caducidad queda la causa en el cheque y el inverso hereda su concepto, sin concepto propio', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ conceptoId: CONCEPTO_DE_DEBITO }));
    casos.movimientos.fechaConciliadaHasta = '2026-02-28';

    const anulado = await casos.anular.ejecutar(operador, {
      chequeId: casos.chequeId,
      motivo: 'Caducó a los 7 meses',
      causa: 'caducidad',
      fecha: '2026-09-10',
    });

    const inverso = (await casos.movimientos.listar({ cuentaBancariaId: CUENTA })).find(
      (m) => m.revierteAId === movimiento.id,
    )!;
    expect(anulado).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'caducidad' });
    expect(inverso).toMatchObject({ tipo: 'credito', conceptoId: CONCEPTO_DE_DEBITO });
  });

  it('un cheque disponible o emitido no tiene causa', async () => {
    const [disponible] = await casos.cheques.listarDeLaChequera(casos.chequeraId);

    expect(disponible).toMatchObject({ estado: 'disponible', causaDeAnulacion: null });
  });
});
