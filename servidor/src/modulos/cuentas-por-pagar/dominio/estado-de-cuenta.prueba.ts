import { describe, expect, it } from 'vitest';
import {
  armarLineasDelEstado,
  conceptoDe,
  totalesDelEstado,
  type MovimientoDelProveedor,
  type RetencionDelDocumento,
} from './estado-de-cuenta.js';

const DOCUMENTO = { id: 'f1', tipo: 'factura', serie: 'A', numero: '10' } as const;

function movimiento(cambios: Partial<MovimientoDelProveedor>): MovimientoDelProveedor {
  return {
    hecho: 'documento',
    fecha: '2026-03-01',
    registradoEn: '2026-03-01 08:00:00',
    esCargo: true,
    montoCentavos: 0,
    anulado: false,
    documento: DOCUMENTO,
    registro: null,
    detalle: null,
    ...cambios,
  };
}

/** Una factura de Q1,120.00 con Q120.00 de retenciones (neto Q1,000.00). */
const factura = movimiento({
  montoCentavos: 100_000,
  detalle: {
    totalCentavos: 112_000,
    retencionesCentavos: 12_000,
    esSaldoInicial: false,
    anterioresAlInicioCentavos: null,
  },
});
const pago = movimiento({
  hecho: 'pago',
  fecha: '2026-03-10',
  esCargo: false,
  montoCentavos: 40_000,
  documento: null,
  registro: { numero: '7', forma: 'cheque', referencia: '5501' },
});
const retenciones: RetencionDelDocumento[] = [
  { documentoId: 'f1', impuesto: 'iva', montoCentavos: 7_000, constanciaNumero: 'C-1' },
  { documentoId: 'f1', impuesto: 'isr', montoCentavos: 5_000, constanciaNumero: null },
];

describe('estado de cuenta interno', () => {
  it('lleva el documento por su neto, con total y retenciones en sus columnas, y el saldo corrido', () => {
    const lineas = armarLineasDelEstado({
      movimientos: [pago, factura],
      retenciones,
      saldoAnteriorCentavos: 50_000,
      presentacion: 'interna',
    });

    expect(lineas).toMatchObject([
      {
        concepto: 'Factura A-10',
        totalCentavos: 112_000,
        retencionesCentavos: 12_000,
        cargoCentavos: 100_000,
        saldoCentavos: 150_000,
      },
      { concepto: 'Pago 7 (cheque 5501)', abonoCentavos: 40_000, saldoCentavos: 110_000 },
    ]);
    expect(totalesDelEstado(lineas, 50_000)).toEqual({
      saldoAnteriorCentavos: 50_000,
      cargosCentavos: 100_000,
      abonosCentavos: 40_000,
      saldoFinalCentavos: 110_000,
    });
  });

  it('un saldo inicial lleva lo anterior a la fecha de inicio y sale por lo que se debía al iniciar', () => {
    const saldoInicial = movimiento({
      montoCentavos: 50_000,
      detalle: {
        totalCentavos: 60_000,
        retencionesCentavos: 0,
        esSaldoInicial: true,
        anterioresAlInicioCentavos: 10_000,
      },
    });

    const [linea] = armarLineasDelEstado({
      movimientos: [saldoInicial],
      retenciones: [],
      saldoAnteriorCentavos: 0,
      presentacion: 'interna',
    });

    expect(linea).toMatchObject({ cargoCentavos: 50_000, totalCentavos: 60_000, anterioresAlInicioCentavos: 10_000 });
  });

  it('ordena por fecha y, el mismo día, por la hora en que se registró', () => {
    const tarde = movimiento({
      hecho: 'reintegro',
      registradoEn: '2026-03-01 18:00:00',
      montoCentavos: 1,
      documento: null,
    });
    const temprano = movimiento({ montoCentavos: 2, registradoEn: '2026-03-01 07:00:00' });

    const lineas = armarLineasDelEstado({
      movimientos: [tarde, temprano],
      retenciones: [],
      saldoAnteriorCentavos: 0,
      presentacion: 'interna',
    });

    expect(lineas.map(({ cargoCentavos }) => cargoCentavos)).toEqual([2, 1]);
  });

  it('una línea anulada sale sin saldo y no suma', () => {
    const anulado = { ...pago, anulado: true };

    const lineas = armarLineasDelEstado({
      movimientos: [factura, anulado],
      retenciones: [],
      saldoAnteriorCentavos: 0,
      presentacion: 'interna',
    });

    expect(lineas[1]).toMatchObject({ anulada: true, saldoCentavos: null });
    expect(totalesDelEstado(lineas, 0)).toMatchObject({ abonosCentavos: 0, saldoFinalCentavos: 100_000 });
  });
});

describe('estado de cuenta para el proveedor', () => {
  it('pone el cargo por el total y cada retención como abono con la misma fecha, con y sin constancia', () => {
    const lineas = armarLineasDelEstado({
      movimientos: [factura],
      retenciones,
      saldoAnteriorCentavos: 0,
      presentacion: 'para_el_proveedor',
    });

    expect(lineas).toMatchObject([
      { concepto: 'Factura A-10', cargoCentavos: 112_000, totalCentavos: null, saldoCentavos: 112_000 },
      {
        concepto: 'Retención de IVA, constancia C-1',
        abonoCentavos: 7_000,
        fecha: '2026-03-01',
        saldoCentavos: 105_000,
      },
      { concepto: 'Retención de ISR, constancia pendiente', abonoCentavos: 5_000, saldoCentavos: 100_000 },
    ]);
  });

  it('termina en el mismo saldo que la presentación interna', () => {
    const entrada = { movimientos: [factura, pago], retenciones, saldoAnteriorCentavos: 25_000 };

    const interna = totalesDelEstado(armarLineasDelEstado({ ...entrada, presentacion: 'interna' }), 25_000);
    const proveedor = totalesDelEstado(armarLineasDelEstado({ ...entrada, presentacion: 'para_el_proveedor' }), 25_000);

    expect(proveedor.saldoFinalCentavos).toBe(interna.saldoFinalCentavos);
  });

  it('lo retenido que Libro de compras no detalla va en un abono aparte, sin impuesto', () => {
    const lineas = armarLineasDelEstado({
      movimientos: [factura],
      retenciones: [retenciones[0]!],
      saldoAnteriorCentavos: 0,
      presentacion: 'para_el_proveedor',
    });

    expect(lineas.at(-1)).toMatchObject({ concepto: 'Retención, constancia pendiente', abonoCentavos: 5_000 });
    expect(lineas.at(-1)?.saldoCentavos).toBe(100_000);
  });

  it('un saldo inicial no muestra retenciones: sale por lo que se debía al iniciar', () => {
    const saldoInicial = movimiento({
      montoCentavos: 50_000,
      detalle: {
        totalCentavos: 60_000,
        retencionesCentavos: 5_000,
        esSaldoInicial: true,
        anterioresAlInicioCentavos: 5_000,
      },
    });

    const lineas = armarLineasDelEstado({
      movimientos: [saldoInicial],
      retenciones: [],
      saldoAnteriorCentavos: 0,
      presentacion: 'para_el_proveedor',
    });

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({ cargoCentavos: 50_000 });
  });
});

describe('conceptoDe', () => {
  it('nombra cada hecho con su documento o su pago', () => {
    const anulacion = movimiento({ hecho: 'anulacion_de_pago', registro: pago.registro });
    const baja = movimiento({ hecho: 'baja_de_saldo_a_favor', documento: { ...DOCUMENTO, tipo: 'nota_de_credito' } });

    expect(conceptoDe(anulacion)).toBe('Anulación del pago 7 (cheque 5501)');
    expect(conceptoDe(baja)).toBe('Baja del saldo a favor de Nota de crédito A-10');
  });
});
