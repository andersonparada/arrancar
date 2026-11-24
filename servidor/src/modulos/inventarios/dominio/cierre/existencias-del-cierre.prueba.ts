import { describe, expect, it } from 'vitest';
import { FotoDelCierreNoCuadra } from '../errores-de-cierre.js';
import { totalesDelCierre, valuarArticulo, valuarExistencias, type ArticuloAlCorte } from './existencias-del-cierre.js';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';

/** Cantidades en diezmilésimas: `libras(50)` son 50.0000. */
const libras = (cantidad: number): bigint => BigInt(cantidad) * 10_000n;

const articulo = (cambios: Partial<ArticuloAlCorte> = {}): ArticuloAlCorte => ({
  articuloId: 'art-1',
  tipoDeInventario: 'mercaderia',
  cantidad: libras(150),
  valor: 31_500n,
  porBodega: [
    { bodegaId: A, cantidad: libras(100) },
    { bodegaId: B, cantidad: libras(50) },
  ],
  enTransito: [],
  ...cambios,
});

describe('valuar un artículo', () => {
  it('reparte el valor entre las bodegas al costo del artículo en toda la empresa', () => {
    const renglones = valuarArticulo(articulo());

    expect(renglones.map((r) => [r.bodegaId, r.cantidad, r.valor, r.costoUnitario])).toEqual([
      [A, libras(100), 21_000n, 2_100_000n],
      [B, libras(50), 10_500n, 2_100_000n],
    ]);
  });

  it('lo que viaja entre bodegas sale en su renglón «En tránsito interno» y sigue en el valor del artículo', () => {
    const renglones = valuarArticulo(
      articulo({
        porBodega: [
          { bodegaId: A, cantidad: libras(100) },
          { bodegaId: B, cantidad: libras(30) },
        ],
        enTransito: [{ bodegaId: A, cantidad: libras(20) }],
      }),
    );

    expect(renglones.map((r) => [r.bodegaId, r.enTransitoInterno, r.valor])).toEqual([
      [A, false, 21_000n],
      [A, true, 4_200n],
      [B, false, 6_300n],
    ]);
    expect(renglones.reduce((suma, r) => suma + r.valor, 0n)).toBe(31_500n);
  });

  it('el último renglón absorbe el redondeo: la suma da exactamente el valor del artículo', () => {
    const renglones = valuarArticulo(
      articulo({
        cantidad: libras(3),
        valor: 1_000n,
        porBodega: [A, B, C].map((bodegaId) => ({ bodegaId, cantidad: libras(1) })),
      }),
    );

    expect(renglones.map((r) => r.valor)).toEqual([333n, 333n, 334n]);
  });

  it('con muchas partes y poco valor el último renglón nunca queda en negativo', () => {
    const bodegas = ['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => ({
      bodegaId: `00000000-0000-0000-0000-00000000000${id}`,
      cantidad: libras(1),
    }));

    const renglones = valuarArticulo(articulo({ cantidad: libras(8), valor: 5n, porBodega: bodegas }));

    expect(renglones.every((r) => r.valor >= 0n)).toBe(true);
    expect(renglones.reduce((suma, r) => suma + r.valor, 0n)).toBe(5n);
  });

  it('el costo unitario es el del artículo con seis decimales, redondeado a la mitad hacia arriba', () => {
    const [renglon] = valuarArticulo(
      articulo({ cantidad: libras(3), valor: 100n, porBodega: [{ bodegaId: A, cantidad: libras(3) }] }),
    );

    expect(renglon!.costoUnitario).toBe(333_333n);
  });

  it('un artículo sin existencia no tiene renglones', () => {
    expect(valuarArticulo(articulo({ cantidad: 0n, valor: 0n, porBodega: [] }))).toEqual([]);
  });

  it('si las bodegas no suman la existencia del artículo, no hay foto', () => {
    const roto = articulo({ porBodega: [{ bodegaId: A, cantidad: libras(100) }] });

    expect(() => valuarArticulo(roto)).toThrow(FotoDelCierreNoCuadra);
  });

  it('una bodega con cantidad negativa tampoco cuadra', () => {
    const roto = articulo({
      porBodega: [
        { bodegaId: A, cantidad: libras(160) },
        { bodegaId: B, cantidad: -libras(10) },
      ],
    });

    expect(() => valuarArticulo(roto)).toThrow(FotoDelCierreNoCuadra);
  });
});

describe('totales del cierre', () => {
  it('suma el valor, cuenta los artículos con existencia y separa el valor por tipo de inventario', () => {
    const renglones = valuarExistencias([
      articulo(),
      articulo({
        articuloId: 'art-2',
        tipoDeInventario: 'suministros',
        cantidad: libras(10),
        valor: 500n,
        porBodega: [{ bodegaId: A, cantidad: libras(10) }],
      }),
    ]);

    expect(totalesDelCierre(renglones)).toEqual({
      valorTotal: 32_000n,
      articulosConExistencia: 2,
      porTipo: [
        { tipoDeInventario: 'mercaderia', valor: 31_500n },
        { tipoDeInventario: 'suministros', valor: 500n },
      ],
    });
  });

  it('sin renglones todo es cero', () => {
    expect(totalesDelCierre([])).toEqual({ valorTotal: 0n, articulosConExistencia: 0, porTipo: [] });
  });
});
