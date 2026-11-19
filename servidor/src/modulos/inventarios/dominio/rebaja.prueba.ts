import { describe, expect, it } from 'vitest';
import { RepartoInvalido } from './costeo/errores.js';
import { DocumentoInvalido } from './errores-de-kardex.js';
import { planDeRebaja, type EntradaParaRepartir, type RebajaEscrita } from './rebaja.js';

/** Una entrada de la factura: cantidad en diezmilésimas y costo en centavos. */
const entrada = (
  movimientoId: string,
  { cantidad, costoTotal, fecha = '2026-09-01' }: { cantidad: bigint; costoTotal: bigint; fecha?: string },
): EntradaParaRepartir => ({
  movimientoId,
  articuloId: `art-${movimientoId}`,
  fecha,
  cantidad,
  costoTotal,
});

const rebaja = (cambios: Partial<RebajaEscrita> = {}): RebajaEscrita => ({
  fecha: '2026-09-20',
  documentoDeCompraId: 'nc1',
  lineaDeCompraId: 'ln1',
  montoCentavos: 3_000n,
  base: 'valor',
  observaciones: null,
  entradas: [
    entrada('e1', { cantidad: 100_0000n, costoTotal: 20_000n }),
    entrada('e2', { cantidad: 50_0000n, costoTotal: 10_000n }),
  ],
  ...cambios,
});

const partes = (cambios?: Partial<RebajaEscrita>) =>
  planDeRebaja(rebaja(cambios)).renglones.map((r) => [r.movimientoDeOrigenId, r.reparto?.parte]);

describe('plan de una rebaja de costo', () => {
  it('es un documento de solo valor, sin bodega, ligado a su nota y a su línea', () => {
    const plan = planDeRebaja(rebaja());

    expect(plan).toMatchObject({ clase: 'rebaja_de_costo', bodegaId: null, documentoDeCompraId: 'nc1' });
    expect(plan.renglones[0]).toMatchObject({ cantidad: 0n, lineaDeCompraId: 'ln1', loteId: null });
    expect(plan.renglones[0]!.reparto).toMatchObject({ base: 'valor' });
  });

  it('reparte el monto en negativo por el valor de las entradas y la suma es exacta', () => {
    expect(partes()).toEqual([
      ['e1', -2_000n],
      ['e2', -1_000n],
    ]);
  });

  it('reparte por la cantidad, y el último renglón absorbe el redondeo', () => {
    const resultado = partes({
      base: 'cantidad',
      montoCentavos: 1_000n,
      entradas: [
        entrada('e1', { cantidad: 1_0000n, costoTotal: 1n }),
        entrada('e2', { cantidad: 1_0000n, costoTotal: 1n }),
        entrada('e3', { cantidad: 1_0000n, costoTotal: 1n }),
      ],
    });

    expect(resultado.map(([, parte]) => parte)).toEqual([-333n, -334n, -333n]);
    expect(resultado.reduce((suma, [, parte]) => suma + (parte as bigint), 0n)).toBe(-1_000n);
  });

  it('no crea renglones con parte cero', () => {
    const resultado = partes({
      montoCentavos: 1n,
      entradas: [
        entrada('e1', { cantidad: 1_0000n, costoTotal: 1n }),
        entrada('e2', { cantidad: 1_0000n, costoTotal: 100_000n }),
      ],
    });

    expect(resultado).toEqual([['e2', -1n]]);
  });

  it('rechaza un monto que no es positivo, una factura sin entradas y una fecha anterior a una entrada', () => {
    expect(() => planDeRebaja(rebaja({ montoCentavos: 0n }))).toThrow(DocumentoInvalido);
    expect(() => planDeRebaja(rebaja({ entradas: [] }))).toThrow(DocumentoInvalido);
    expect(() => planDeRebaja(rebaja({ fecha: '2026-08-31' }))).toThrow(DocumentoInvalido);
  });

  it('rechaza repartir por un valor que suma cero', () => {
    expect(() => planDeRebaja(rebaja({ entradas: [entrada('e1', { cantidad: 1_0000n, costoTotal: 0n })] }))).toThrow(
      RepartoInvalido,
    );
  });
});
