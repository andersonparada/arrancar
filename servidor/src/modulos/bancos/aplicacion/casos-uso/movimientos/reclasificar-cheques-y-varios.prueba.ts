import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  ConceptoDeSistemaNoSeElige,
  ConceptoIncompatible,
  NoEsUnChequeParaReclasificar,
  PagoAProveedoresLoFijaCuentasPorPagar,
  UnChequeSeReclasificaComoCheque,
  CantidadInvalidaParaReclasificar,
} from '../../../dominio/errores-de-conceptos.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import {
  CONCEPTO_DE_CREDITO,
  CONCEPTO_DE_DEBITO,
  CONCEPTO_GENERAL,
  CONCEPTO_SIN_CLASIFICAR,
  idDeSistema,
} from '../../../pruebas/conceptos-de-prueba.js';
import { armarEntorno, nota, operador, CUENTA } from './soporte-de-pruebas-de-movimientos.js';

const PAGO_A_PROVEEDORES = idDeSistema('pago_a_proveedor');

/** Un cheque emitido con el concepto que se quiera (como lo dejaría el emisor o la migración). */
async function cheque(casos: ReturnType<typeof armarEntorno>, conceptoId = CONCEPTO_SIN_CLASIFICAR): Promise<string> {
  const movimiento = Movimiento.crear(Identificador.desde(operador.empresaId), {
    cuentaBancariaId: CUENTA,
    tipo: 'cheque',
    fecha: '2026-01-20',
    monto: '50.00',
    saldoInicial: false,
    referencia: null,
    beneficiario: 'Ferretería',
    observaciones: null,
    conceptoId,
  });
  await casos.registros.agregar(movimiento);
  return movimiento.id.valor;
}

async function notaSinClasificar(casos: ReturnType<typeof armarEntorno>, cambios = {}): Promise<string> {
  const creada = await casos.crear.ejecutar(operador, { ...nota(cambios), conceptoId: CONCEPTO_GENERAL });
  const movimiento = (await casos.registros.buscar(Identificador.desde(creada.id)))!;
  movimiento.reclasificar(CONCEPTO_SIN_CLASIFICAR);
  await casos.registros.guardar(movimiento);
  return creada.id;
}

const conceptoDe = async (casos: ReturnType<typeof armarEntorno>, id: string) =>
  (await casos.obtener.ejecutar(operador, id)).conceptoId;

describe('«Pago a proveedores» al reclasificar un cheque (P3)', () => {
  it('un cheque pendiente lo acepta si Cuentas por pagar no está activo, y queda auditado', async () => {
    const casos = armarEntorno();
    const id = await cheque(casos);

    const resultado = await casos.reclasificar.ejecutar(operador, {
      movimientoIds: [id],
      conceptoId: PAGO_A_PROVEEDORES,
    });

    expect(resultado).toEqual({ reclasificados: 1, sinCambio: 0 });
    expect(await conceptoDe(casos, id)).toBe(PAGO_A_PROVEEDORES);
    expect(casos.auditoria.entradas).toEqual([
      expect.objectContaining({
        registroId: id,
        accion: 'corregir',
        motivo: 'Reclasificado de «Sin clasificar» a «Pago a proveedores»',
      }),
    ]);
  });

  it('con Cuentas por pagar activo lo reserva ese módulo', async () => {
    const casos = armarEntorno({ cuentasPorPagar: true });
    const id = await cheque(casos);

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: PAGO_A_PROVEEDORES }),
    ).rejects.toThrow(PagoAProveedoresLoFijaCuentasPorPagar);
  });

  it('una nota de débito nunca lo recibe: es de los cheques', async () => {
    const casos = armarEntorno({ permiteSobregiro: true });
    const id = await notaSinClasificar(casos, { tipo: 'debito' });

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: PAGO_A_PROVEEDORES }),
    ).rejects.toThrow(ConceptoDeSistemaNoSeElige);
  });

  it('otro concepto de sistema no se elige en un cheque', async () => {
    const casos = armarEntorno();
    const id = await cheque(casos);

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [id], conceptoId: idDeSistema('transferencia') }),
    ).rejects.toThrow(ConceptoDeSistemaNoSeElige);
  });
});

describe('reclasificar un cheque desde el reporte', () => {
  it('con la clase de cheques procede aunque ya esté clasificado, y audita corregir con el anterior', async () => {
    const casos = armarEntorno();
    const id = await cheque(casos, CONCEPTO_GENERAL);

    const resultado = await casos.reclasificarCheques.ejecutar(operador, {
      movimientoIds: [id],
      conceptoId: CONCEPTO_DE_DEBITO,
    });

    expect(resultado).toEqual({ reclasificados: 1, sinCambio: 0 });
    expect(await conceptoDe(casos, id)).toBe(CONCEPTO_DE_DEBITO);
    expect(casos.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'bancos.movimientos',
        registroId: id,
        accion: 'corregir',
        anterior: expect.objectContaining({ conceptoId: CONCEPTO_GENERAL }),
        motivo: 'Reclasificado de «General» a «Comisiones bancarias»',
      }),
    ]);
  });

  it('valida el concepto como en cualquier cheque: compatible con un débito', async () => {
    const casos = armarEntorno();
    const id = await cheque(casos, CONCEPTO_GENERAL);

    await expect(
      casos.reclasificarCheques.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_CREDITO }),
    ).rejects.toThrow(ConceptoIncompatible);
  });

  it('la ruta de las notas no toca un cheque ya clasificado, pero sí uno pendiente (la bandeja)', async () => {
    const casos = armarEntorno();
    const clasificado = await cheque(casos, CONCEPTO_GENERAL);
    const pendiente = await cheque(casos);

    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [clasificado], conceptoId: CONCEPTO_DE_DEBITO }),
    ).rejects.toThrow(UnChequeSeReclasificaComoCheque);
    await casos.reclasificar.ejecutar(operador, { movimientoIds: [pendiente], conceptoId: CONCEPTO_DE_DEBITO });

    expect(await conceptoDe(casos, pendiente)).toBe(CONCEPTO_DE_DEBITO);
  });

  it('la ruta de los cheques rechaza una nota', async () => {
    const casos = armarEntorno();
    const id = await notaSinClasificar(casos);

    await expect(
      casos.reclasificarCheques.ejecutar(operador, { movimientoIds: [id], conceptoId: CONCEPTO_DE_CREDITO }),
    ).rejects.toThrow(NoEsUnChequeParaReclasificar);
  });
});

describe('reclasificar varios con un concepto por movimiento (aceptar sugerencias)', () => {
  it('asigna a cada uno el suyo, audita cada cambio y marca la sugerencia aceptada en el motivo', async () => {
    const casos = armarEntorno({ permiteSobregiro: true });
    const entrada = await notaSinClasificar(casos);
    const salida = await notaSinClasificar(casos, { tipo: 'debito', fecha: '2026-01-20' });

    const resultado = await casos.reclasificarVarios.ejecutar(operador, {
      asignaciones: [
        { movimientoId: entrada, conceptoId: CONCEPTO_DE_CREDITO },
        { movimientoId: salida, conceptoId: CONCEPTO_DE_DEBITO },
      ],
      porSugerencia: true,
    });

    expect(resultado).toEqual({ reclasificados: 2, sinCambio: 0 });
    expect(await conceptoDe(casos, entrada)).toBe(CONCEPTO_DE_CREDITO);
    expect(await conceptoDe(casos, salida)).toBe(CONCEPTO_DE_DEBITO);
    expect(casos.auditoria.entradas.map((e) => e.motivo)).toEqual([
      'Reclasificado de «Sin clasificar» a «Depósito de ventas» (sugerencia aceptada)',
      'Reclasificado de «Sin clasificar» a «Comisiones bancarias» (sugerencia aceptada)',
    ]);
  });

  it('sin sugerencia el motivo es el de siempre, y lo que ya tenía el concepto no cuenta', async () => {
    const casos = armarEntorno();
    const id = await notaSinClasificar(casos);
    const asignaciones = [{ movimientoId: id, conceptoId: CONCEPTO_DE_CREDITO }];
    await casos.reclasificarVarios.ejecutar(operador, { asignaciones, porSugerencia: false });
    expect(casos.auditoria.entradas[0]?.motivo).toBe('Reclasificado de «Sin clasificar» a «Depósito de ventas»');

    casos.auditoria.entradas.length = 0;
    const otra = await casos.reclasificarVarios.ejecutar(operador, { asignaciones, porSugerencia: true });

    expect(otra).toEqual({ reclasificados: 0, sinCambio: 1 });
    expect(casos.auditoria.entradas).toEqual([]);
  });

  it('cada asignación pasa por las mismas reglas: un concepto incompatible con alguna falla', async () => {
    const casos = armarEntorno();
    const credito = await notaSinClasificar(casos);
    const debito = await notaSinClasificar(casos, { tipo: 'debito', fecha: '2026-01-20' });

    await expect(
      casos.reclasificarVarios.ejecutar(operador, {
        asignaciones: [
          { movimientoId: credito, conceptoId: CONCEPTO_DE_CREDITO },
          { movimientoId: debito, conceptoId: CONCEPTO_DE_CREDITO },
        ],
        porSugerencia: true,
      }),
    ).rejects.toThrow(ConceptoIncompatible);
  });

  it('arrastra al inverso y acepta cheques pendientes con «Pago a proveedores»', async () => {
    const casos = armarEntorno();
    const id = await notaSinClasificar(casos);
    await casos.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error' });
    const chequePendiente = await cheque(casos);
    casos.auditoria.entradas.length = 0;

    await casos.reclasificarVarios.ejecutar(operador, {
      asignaciones: [
        { movimientoId: id, conceptoId: CONCEPTO_DE_CREDITO },
        { movimientoId: chequePendiente, conceptoId: PAGO_A_PROVEEDORES },
      ],
      porSugerencia: true,
    });

    const inverso = (await casos.listar.ejecutar(operador, {})).find((m) => m.revierteAId === id)!;
    expect(inverso.conceptoId).toBe(CONCEPTO_DE_CREDITO);
    expect(await conceptoDe(casos, chequePendiente)).toBe(PAGO_A_PROVEEDORES);
    expect(casos.auditoria.entradas).toHaveLength(3);
  });

  it('acepta de 1 a 200 asignaciones y ningún movimiento repetido', async () => {
    const casos = armarEntorno();
    const asignacion = () => ({ movimientoId: randomUUID(), conceptoId: CONCEPTO_DE_CREDITO });
    const ejecutar = (asignaciones: ReturnType<typeof asignacion>[]) =>
      casos.reclasificarVarios.ejecutar(operador, { asignaciones, porSugerencia: false });

    await expect(ejecutar([])).rejects.toThrow(CantidadInvalidaParaReclasificar);
    await expect(ejecutar(Array.from({ length: 201 }, asignacion))).rejects.toThrow(CantidadInvalidaParaReclasificar);
    const repetida = asignacion();
    await expect(ejecutar([repetida, repetida])).rejects.toThrow(CantidadInvalidaParaReclasificar);
  });
});
