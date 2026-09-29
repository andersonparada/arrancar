import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  CantidadInvalidaParaReclasificar,
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  NoSeReclasificaElSaldoInicial,
  NoSeReclasificaUnInverso,
} from '../../../dominio/errores-de-conceptos.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_GENERAL,
  CONCEPTO_SIN_CLASIFICAR,
} from '../../../pruebas/conceptos-de-prueba.js';
import { armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

let casos: ReturnType<typeof armarEntorno>;

beforeEach(() => {
  casos = armarEntorno({ permiteSobregiro: true });
});

/** Una nota que quedó «Sin clasificar», como las que dejó la migración. */
async function notaSinClasificar(cambios: Record<string, unknown> = {}): Promise<string> {
  const creada = await casos.crear.ejecutar(operador, { ...nota(cambios), conceptoId: CONCEPTO_GENERAL });
  const movimiento = (await casos.registros.buscar(Identificador.desde(creada.id)))!;
  movimiento.reclasificar(CONCEPTO_SIN_CLASIFICAR);
  await casos.registros.guardar(movimiento);
  return creada.id;
}

const conceptoDe = async (id: string) => (await casos.obtener.ejecutar(operador, id)).conceptoId;

const inversoDe = async (id: string) => (await casos.listar.ejecutar(operador, {})).find((m) => m.revierteAId === id)!;

describe('reclasificar', () => {
  it('cambia el concepto de varios movimientos a la vez y lo audita como corregir con el anterior y el nuevo', async () => {
    const a = await notaSinClasificar();
    const b = await notaSinClasificar({ fecha: '2026-01-20' });

    const resultado = await casos.reclasificar.ejecutar(operador, {
      movimientoIds: [a, b],
      conceptoId: CONCEPTO_DE_CREDITO,
    });

    expect(resultado).toEqual({ reclasificados: 2, sinCambio: 0 });
    expect(await conceptoDe(a)).toBe(CONCEPTO_DE_CREDITO);
    expect(await conceptoDe(b)).toBe(CONCEPTO_DE_CREDITO);
    expect(casos.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'bancos.movimientos',
        registroId: a,
        accion: 'corregir',
        anterior: expect.objectContaining({ conceptoId: CONCEPTO_SIN_CLASIFICAR, conceptoNombre: 'Sin clasificar' }),
        motivo: 'Reclasificado de «Sin clasificar» a «Depósito de ventas»',
      }),
      expect.objectContaining({ registroId: b, accion: 'corregir' }),
    ]);
  });

  it('procede en un mes conciliado, porque no toca dinero ni fechas', async () => {
    const id = await notaSinClasificar();
    casos.registros.fechaConciliadaHasta = '2026-01-31';

    await casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_CREDITO });

    expect(await conceptoDe(id)).toBe(CONCEPTO_DE_CREDITO);
  });

  it('arrastra al inverso de un movimiento revertido y audita los dos', async () => {
    const id = await notaSinClasificar();
    await casos.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error' });
    casos.auditoria.entradas.length = 0;

    await casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_CREDITO });

    expect((await inversoDe(id)).conceptoId).toBe(CONCEPTO_DE_CREDITO);
    expect(casos.auditoria.acciones()).toEqual(['bancos.movimientos:corregir', 'bancos.movimientos:corregir']);
  });

  it('no reclasifica un inverso ni el saldo inicial', async () => {
    const id = await notaSinClasificar();
    await casos.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error' });
    const inverso = await inversoDe(id);
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [inverso.id], conceptoId: CONCEPTO_DE_CREDITO }),
    ).rejects.toThrow(NoSeReclasificaUnInverso);
    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [inicial.id], conceptoId: CONCEPTO_DE_CREDITO }),
    ).rejects.toThrow(NoSeReclasificaElSaldoInicial);
  });

  it('rechaza sin_clasificar, un concepto que no existe y uno incompatible con el tipo', async () => {
    const id = await notaSinClasificar();

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_SIN_CLASIFICAR }),
    ).rejects.toThrow(ConceptoDeSistemaNoSeElige);
    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_DEBITO }),
    ).rejects.toThrow(ConceptoIncompatible);
    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: randomUUID() }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });

  it('si algún movimiento no admite el concepto, falla (la transacción real deshace todo)', async () => {
    const credito = await notaSinClasificar();
    const debito = await notaSinClasificar({ tipo: 'debito', fecha: '2026-01-21' });

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [credito, debito], conceptoId: CONCEPTO_DE_CREDITO }),
    ).rejects.toThrow(ConceptoIncompatible);
  });

  it('no cuenta ni audita los que ya tenían ese concepto', async () => {
    const id = await notaSinClasificar();
    await casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_CREDITO });
    casos.auditoria.entradas.length = 0;

    const resultado = await casos.reclasificar.ejecutar(operador, {
      movimientoIds: [id, id],
      conceptoId: CONCEPTO_DE_CREDITO,
    });

    expect(resultado).toEqual({ reclasificados: 0, sinCambio: 1 });
    expect(casos.auditoria.entradas).toEqual([]);
  });

  it('acepta de 1 a 200 movimientos', async () => {
    const ids = (cantidad: number) => Array.from({ length: cantidad }, () => randomUUID());
    const conceptoId = CONCEPTO_DE_CREDITO;

    await expect(casos.reclasificar.ejecutar(operador, { movimientoIds: [], conceptoId })).rejects.toThrow(
      CantidadInvalidaParaReclasificar,
    );
    await expect(casos.reclasificar.ejecutar(operador, { movimientoIds: ids(201), conceptoId })).rejects.toThrow(
      CantidadInvalidaParaReclasificar,
    );
  });
});
