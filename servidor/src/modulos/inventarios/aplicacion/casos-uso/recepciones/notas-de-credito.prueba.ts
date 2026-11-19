import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ExistenciaNegativa } from '../../../dominio/costeo/errores.js';
import {
  DevolucionMayorQueLaEntrada,
  LineaSobrerrecibida,
  RecepcionConDocumentosPosteriores,
} from '../../../dominio/errores-de-recepcion.js';
import { ARTICULO, BODEGA, EscenarioDeRecepciones } from '../../../pruebas/escenario-de-recepciones.js';

let e: EscenarioDeRecepciones;

beforeEach(() => {
  e = new EscenarioDeRecepciones();
});

/** Recibe 100 lb a Q200.00 de la factura `lf` (Q200.00) y devuelve la entrada que quedó en el kardex. */
async function recibirCien(lineaId = 'lf', costoCentavos = 20_000n) {
  e.factura(lineaId, costoCentavos);
  const [documento] = await e.recibir([e.renglon(lineaId, '100', '200.00')]);
  return { documento: documento!, entradaId: documento!.renglones[0]!.movimientoId };
}

describe('RegistrarDevolucionAProveedor', () => {
  it('sale de la bodega de la entrada al costo de su entrada y publica la devolución', async () => {
    const { entradaId } = await recibirCien();
    e.nota('ln', 'lf', 3_000n);

    const devolucion = await e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '10', unidadId: null }]);

    expect(devolucion).toMatchObject({
      clase: 'devolucion_a_proveedor',
      numero: 1,
      bodegaId: BODEGA,
      documentoDeCompraId: 'doc-ln',
      costoTotal: '20.00',
    });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(90_0000n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 90_0000n, valor: 18_000n });
    const ultimo = e.base.publicador.publicados.at(-1)!;
    expect(ultimo).toMatchObject({
      nombre: 'inventarios.devolucion_a_proveedor',
      datos: { documentoDeCompraId: 'doc-ln', entradasDevueltas: [entradaId] },
    });
  });

  it('sale al costo de su entrada aunque el promedio del artículo ya sea otro', async () => {
    const { entradaId } = await recibirCien();
    e.factura('lg', 23_000n);
    await e.recibir([e.renglon('lg', '100', '230.00')], { fecha: '2026-09-02' });
    e.nota('ln', 'lf', 3_000n);

    const devolucion = await e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '10', unidadId: null }]);

    expect(devolucion.costoTotal).toBe('20.00');
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 190_0000n, valor: 43_000n - 2_000n });
  });

  it('no devuelve más de lo que queda por devolver de la entrada, sumando lo ya devuelto', async () => {
    const { entradaId } = await recibirCien();
    e.nota('ln', 'lf', 30_000n);
    await e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '70', unidadId: null }]);

    const devolver = e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '30.0001', unidadId: null }]);

    await expect(devolver).rejects.toBeInstanceOf(DevolucionMayorQueLaEntrada);
  });

  it('no devuelve lo que ya se consumió: la existencia no puede quedar negativa', async () => {
    const { entradaId } = await recibirCien();
    await e.base.registrarSalida('95', { fecha: '2026-09-10' });
    e.nota('ln', 'lf', 30_000n);

    const devolver = e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '10', unidadId: null }]);

    await expect(devolver).rejects.toBeInstanceOf(ExistenciaNegativa);
  });

  it('no encuentra una entrada que no es de una recepción vigente', async () => {
    const { entradaId, documento } = await recibirCien();
    await e.anular('recepcion_de_compra', documento.id);
    e.nota('ln', 'lf', 3_000n);

    const devolver = e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '1', unidadId: null }]);

    await expect(devolver).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('con PEPS rebaja la capa de su entrada y no la más antigua', async () => {
    e.base.metodoInicial.metodo = 'peps';
    await recibirCien('lf', 20_000n);
    e.factura('lg', 23_000n);
    const [segunda] = await e.recibir([e.renglon('lg', '100', '230.00')], { fecha: '2026-09-02' });
    e.nota('ln', 'lg', 3_000n);

    await e.devolver('ln', [
      { movimientoDeEntradaId: segunda!.renglones[0]!.movimientoId, cantidad: '10', unidadId: null },
    ]);
    const salida = await e.base.registrarSalida('120', { fecha: '2026-09-22' });

    expect(salida.costoTotal).toBe('246.00');
  });
});

describe('RegistrarRebajaDeCosto', () => {
  it('baja el costo de las entradas de la factura y absorbe solo lo que sigue en existencia', async () => {
    const { entradaId } = await recibirCien();
    await e.base.registrarSalida('40', { fecha: '2026-09-02' });
    e.nota('ln', 'lf', 3_000n);

    const rebaja = await e.rebajar('ln', '30.00', { fecha: '2026-09-20' });

    expect(rebaja).toMatchObject({
      clase: 'rebaja_de_costo',
      bodegaId: null,
      documentoDeCompraId: 'doc-ln',
      costoTotal: '18.00',
    });
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 60_0000n, valor: 10_200n });
    const movimiento = e.kardex.movimientos.find((m) => m.tipo === 'valor')!;
    expect(movimiento).toMatchObject({
      movimientoDeOrigenId: entradaId,
      costoTotal: -1_800n,
      montoAResultados: -1_200n,
    });
    expect(e.base.publicador.publicados.at(-1)).toMatchObject({
      nombre: 'inventarios.costo_ajustado',
      datos: {
        repartos: [{ movimientoDeEntradaId: entradaId, absorbidoCentavos: -1_800, aResultadosCentavos: -1_200 }],
      },
    });
  });

  it('no mueve existencias y no pasa del costo de la línea de la nota, sumando lo ya rebajado', async () => {
    await recibirCien();
    e.nota('ln', 'lf', 3_000n);
    await e.rebajar('ln', '20.00', { fecha: '2026-09-02' });

    const demasiado = e.rebajar('ln', '10.01', { fecha: '2026-09-02' });

    await expect(demasiado).rejects.toBeInstanceOf(LineaSobrerrecibida);
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(100_0000n);
    await expect(e.rebajar('ln', '10.00', { fecha: '2026-09-02' })).resolves.toBeDefined();
  });

  it('una salida registrada después con fecha anterior cambia lo absorbido y el evento lo informa', async () => {
    await recibirCien();
    e.nota('ln', 'lf', 3_000n);
    await e.rebajar('ln', '30.00', { fecha: '2026-09-20' });
    e.base.publicador.publicados.length = 0;

    await e.base.registrarSalida('40', { fecha: '2026-09-02' });

    const recalculo = e.base.publicador.publicados.find((p) => p.nombre === 'inventarios.costo_recalculado');
    expect(recalculo!.datos).toMatchObject({
      repartos: [{ diferenciaAbsorbidoCentavos: 1_200, diferenciaAResultadosCentavos: -1_200 }],
    });
    expect(e.kardex.recalculos.at(-1)).toMatchObject({ repartosAfectados: 1, diferenciaAResultados: -1_200n });
  });

  it('exige una factura con entradas y una fecha que no sea anterior a ellas', async () => {
    e.factura('lf', 20_000n);
    e.nota('ln', 'lf', 3_000n);
    await expect(e.rebajar('ln', '1.00')).rejects.toThrow('no tiene entradas');

    await recibirCien('lh', 20_000n);
    e.nota('lm', 'lh', 3_000n);
    await expect(e.rebajar('lm', '1.00', { fecha: '2026-08-31' })).rejects.toThrow('anterior');
  });
});

describe('anular recepciones, devoluciones y rebajas', () => {
  it('una recepción con devoluciones o rebajas vigentes no se anula hasta anular ellas', async () => {
    const { documento, entradaId } = await recibirCien();
    e.nota('ln', 'lf', 3_000n);
    const devolucion = await e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '10', unidadId: null }]);

    await expect(e.anular('recepcion_de_compra', documento.id)).rejects.toBeInstanceOf(
      RecepcionConDocumentosPosteriores,
    );
    await e.anular('devolucion_a_proveedor', devolucion.id);
    await e.anular('recepcion_de_compra', documento.id);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(0n);
    expect(e.base.auditoria.acciones()).toEqual([
      'inventarios.devoluciones-a-proveedor:anular',
      'inventarios.recepciones:anular',
    ]);
  });

  it('anular una devolución devuelve la existencia y el valor, y anular una rebaja restituye el costo', async () => {
    const { entradaId } = await recibirCien();
    e.nota('ln', 'lf', 3_000n);
    const devolucion = await e.devolver('ln', [{ movimientoDeEntradaId: entradaId, cantidad: '10', unidadId: null }]);
    const rebaja = await e.rebajar('ln', '5.00', { fecha: '2026-09-22' });

    await e.anular('rebaja_de_costo', rebaja.id);
    await e.anular('devolucion_a_proveedor', devolucion.id);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(100_0000n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: 100_0000n, valor: 20_000n });
  });

  it('una línea con la recepción anulada vuelve a poder recibirse completa', async () => {
    const { documento } = await recibirCien();
    await e.anular('recepcion_de_compra', documento.id);

    await expect(e.recibir([e.renglon('lf', '100', '200.00')])).resolves.toHaveLength(1);
  });
});
