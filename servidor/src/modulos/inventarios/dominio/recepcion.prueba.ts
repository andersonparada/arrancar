import { describe, expect, it } from 'vitest';
import { DocumentoInvalido } from './errores-de-kardex.js';
import { LineaDescartada, LineaNoRecibible, LineaSobrerrecibida } from './errores-de-recepcion.js';
import type { LineaDeCompra } from './linea-de-compra.js';
import type { RenglonDePlan } from './plan-de-documento.js';
import { planesDeRecepcion, type RenglonRecibido } from './recepcion.js';

const linea = (cambios: Partial<LineaDeCompra> = {}): LineaDeCompra => ({
  lineaId: 'l1',
  documentoId: 'd1',
  tipoDeDocumento: 'factura',
  documentoVigente: true,
  documentoAfectadoId: null,
  documento: 'A-100',
  numeroDeLinea: 1,
  fechaEmision: '2026-09-10',
  esInventario: true,
  costoCentavos: 100_000n,
  aplicadoCentavos: 0n,
  descartada: false,
  ...cambios,
});

const renglon = (montoCentavos: bigint, cambios: Partial<RenglonDePlan> = {}): RenglonDePlan => ({
  articuloId: 'a1',
  loteId: null,
  cantidad: 100_0000n,
  cantidadEscrita: 100_0000n,
  unidadEscritaId: 'lb',
  costoTotal: montoCentavos,
  ...cambios,
});

const recepcion = (renglones: RenglonRecibido[], fecha = '2026-09-10') =>
  planesDeRecepcion({ fecha, bodegaId: 'b1', observaciones: null, renglones });

describe('planes de una recepción', () => {
  it('crea una recepción por documento del libro, con la línea y el costo de cada renglón', () => {
    const otra = linea({ lineaId: 'l2', documentoId: 'd2', documento: 'A-200' });

    const planes = recepcion([
      { linea: linea(), renglon: renglon(40_000n) },
      { linea: otra, renglon: renglon(10_000n, { articuloId: 'a2' }) },
      { linea: linea(), renglon: renglon(60_000n, { articuloId: 'a3' }) },
    ]);

    expect(planes).toHaveLength(2);
    expect(planes[0]).toMatchObject({ clase: 'recepcion_de_compra', bodegaId: 'b1', documentoDeCompraId: 'd1' });
    expect(planes[0]!.renglones.map((r) => [r.lineaDeCompraId, r.costoTotal])).toEqual([
      ['l1', 40_000n],
      ['l1', 60_000n],
    ]);
    expect(planes[1]).toMatchObject({ documentoDeCompraId: 'd2' });
  });

  it('suma los renglones de la misma línea contra su costo: recibir en partes deja el resto pendiente', () => {
    expect(() => recepcion([{ linea: linea({ aplicadoCentavos: 30_000n }), renglon: renglon(70_000n) }])).not.toThrow();

    const sobrepasa = () =>
      recepcion([
        { linea: linea({ aplicadoCentavos: 30_000n }), renglon: renglon(40_000n) },
        { linea: linea({ aplicadoCentavos: 30_000n }), renglon: renglon(30_001n) },
      ]);
    expect(sobrepasa).toThrow(LineaSobrerrecibida);
  });

  it('avisa con el pendiente que queda en la línea', () => {
    try {
      recepcion([{ linea: linea({ aplicadoCentavos: 99_000n }), renglon: renglon(1_001n) }]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(LineaSobrerrecibida);
      expect((error as LineaSobrerrecibida).detalles).toEqual({ pendienteCentavos: '1000' });
    }
  });

  it('rechaza lo que el libro no deja recibir: anulado, nota de crédito, sin marca o descartada', () => {
    const intentar = (l: LineaDeCompra) => () => recepcion([{ linea: l, renglon: renglon(100n) }]);

    expect(intentar(linea({ documentoVigente: false }))).toThrow(LineaNoRecibible);
    expect(intentar(linea({ tipoDeDocumento: 'nota_de_credito' }))).toThrow(LineaNoRecibible);
    expect(intentar(linea({ esInventario: false }))).toThrow(LineaNoRecibible);
    expect(intentar(linea({ descartada: true }))).toThrow(LineaDescartada);
  });

  it('exige renglones con cantidad y monto mayores que cero', () => {
    expect(() => recepcion([])).toThrow(DocumentoInvalido);
    expect(() => recepcion([{ linea: linea(), renglon: renglon(0n) }])).toThrow(DocumentoInvalido);
    expect(() => recepcion([{ linea: linea(), renglon: renglon(100n, { cantidad: 0n }) }])).toThrow(DocumentoInvalido);
  });

  it('avisa si la mercadería llegó más de 30 días antes de la emisión, y no antes', () => {
    const emitida = linea({ fechaEmision: '2026-09-30' });

    const justo = recepcion([{ linea: emitida, renglon: renglon(100n) }], '2026-08-31');
    const lejos = recepcion([{ linea: emitida, renglon: renglon(100n) }], '2026-08-30');

    expect(justo[0]!.avisos).toEqual([]);
    expect(lejos[0]!.avisos).toHaveLength(1);
    expect(lejos[0]!.avisos[0]).toContain('A-100');
  });
});
