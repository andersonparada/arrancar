import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoInactivo,
  ConceptoIncompatible,
  ConceptoObligatorio,
} from '../../../dominio/errores-de-conceptos.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_GENERAL,
  CONCEPTO_INACTIVO,
  CONCEPTO_SALDO_INICIAL,
  CONCEPTO_SIN_CLASIFICAR,
  CONCEPTO_TRANSFERENCIA,
} from '../../../pruebas/conceptos-de-prueba.js';
import { armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

beforeEach(() => {
  casos = armarEntorno({ permiteSobregiro: true });
});

const conConcepto = (conceptoId: string | undefined, cambios: Record<string, unknown> = {}) => ({
  ...nota(cambios),
  conceptoId,
});

describe('elegir el concepto al registrar una nota', () => {
  it('acepta uno activo y compatible, y el DTO trae su id y su nombre', async () => {
    const credito = await casos.crear.ejecutar(operador, conConcepto(CONCEPTO_DE_CREDITO));
    await casos.crear.ejecutar(operador, conConcepto(CONCEPTO_GENERAL));
    await casos.crear.ejecutar(operador, conConcepto(CONCEPTO_DE_DEBITO, { tipo: 'debito', fecha: '2026-01-16' }));

    expect(credito).toMatchObject({ conceptoId: CONCEPTO_DE_CREDITO, conceptoNombre: 'Depósito de ventas' });
  });

  it('exige concepto', async () => {
    await expect(casos.crear.ejecutar(operador, conConcepto(undefined))).rejects.toThrow(ConceptoObligatorio);
  });

  it('rechaza sin_clasificar y cualquier otro concepto de sistema: solo los asigna el sistema', async () => {
    await expect(casos.crear.ejecutar(operador, conConcepto(CONCEPTO_SIN_CLASIFICAR))).rejects.toThrow(
      ConceptoDeSistemaNoSeElige,
    );
    await expect(casos.crear.ejecutar(operador, conConcepto(CONCEPTO_TRANSFERENCIA))).rejects.toThrow(
      ConceptoDeSistemaNoSeElige,
    );
  });

  it('rechaza uno inactivo, uno incompatible con el tipo y uno que no existe', async () => {
    await expect(casos.crear.ejecutar(operador, conConcepto(CONCEPTO_INACTIVO))).rejects.toThrow(ConceptoInactivo);
    await expect(casos.crear.ejecutar(operador, conConcepto(CONCEPTO_DE_DEBITO))).rejects.toThrow(ConceptoIncompatible);
    await expect(casos.crear.ejecutar(operador, conConcepto(CONCEPTO_DE_CREDITO, { tipo: 'debito' }))).rejects.toThrow(
      ConceptoIncompatible,
    );
    await expect(casos.crear.ejecutar(operador, conConcepto(randomUUID()))).rejects.toThrow(RecursoNoEncontrado);
  });

  it('el saldo inicial lleva el concepto de sistema, sin que nadie lo elija', async () => {
    const inicial = await casos.crear.ejecutar(
      operador,
      conConcepto(undefined, { saldoInicial: true, fecha: '2026-01-01' }),
    );

    expect(inicial).toMatchObject({ conceptoId: CONCEPTO_SALDO_INICIAL, conceptoNombre: 'Saldo inicial' });
  });
});

describe('corregir una nota', () => {
  it('cambia el concepto y revisa la compatibilidad con el tipo nuevo', async () => {
    const creada = await casos.crear.ejecutar(operador, conConcepto(CONCEPTO_DE_CREDITO));

    await expect(
      casos.actualizar.ejecutar(operador, {
        movimientoId: creada.id,
        solicitud: conConcepto(CONCEPTO_DE_CREDITO, { tipo: 'debito' }),
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(ConceptoIncompatible);
    const corregida = await casos.actualizar.ejecutar(operador, {
      movimientoId: creada.id,
      solicitud: conConcepto(CONCEPTO_DE_DEBITO, { tipo: 'debito' }),
      esSaldoInicial: false,
    });

    expect(corregida.conceptoId).toBe(CONCEPTO_DE_DEBITO);
  });

  it('el saldo inicial conserva su concepto de sistema al corregirlo', async () => {
    const inicial = await casos.crear.ejecutar(operador, conConcepto(undefined, { saldoInicial: true }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: inicial.id,
      solicitud: conConcepto(undefined, { saldoInicial: true, monto: '500.00' }),
      esSaldoInicial: true,
    });

    expect(corregido).toMatchObject({ conceptoId: CONCEPTO_SALDO_INICIAL, monto: '500.00' });
  });
});

describe('el inverso hereda el concepto', () => {
  it('el inverso de una nota de débito es un crédito con el concepto de débito, sin validar nada', async () => {
    await casos.crear.ejecutar(operador, conConcepto(undefined, { saldoInicial: true, fecha: '2026-01-01' }));
    const original = await casos.crear.ejecutar(
      operador,
      conConcepto(CONCEPTO_DE_DEBITO, { tipo: 'debito', monto: '10.00' }),
    );

    await casos.anular.ejecutar(operador, { movimientoId: original.id, motivo: 'Error' });

    const inverso = (await casos.listar.ejecutar(operador, {})).find((m) => m.revierteAId === original.id)!;
    expect(inverso).toMatchObject({ tipo: 'credito', conceptoId: CONCEPTO_DE_DEBITO });
  });

  it('hereda el concepto de su original, sea el que sea', async () => {
    const original = await casos.crear.ejecutar(operador, conConcepto(CONCEPTO_GENERAL));
    await casos.anular.ejecutar(operador, { movimientoId: original.id, motivo: 'Error' });

    const inverso = (await casos.listar.ejecutar(operador, {})).find((m) => m.revierteAId === original.id)!;
    expect(inverso.conceptoId).toBe(CONCEPTO_GENERAL);
  });
});
