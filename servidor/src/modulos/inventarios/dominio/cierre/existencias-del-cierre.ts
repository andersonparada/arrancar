import { FotoDelCierreNoCuadra } from '../errores-de-cierre.js';
import type { TipoDeInventario } from '../tipos-de-inventario.js';

/** Cuántas bodegas tienen cuánto de un artículo (cantidad en diezmilésimas). */
export interface CantidadEnBodega {
  bodegaId: string;
  cantidad: bigint;
}

/**
 * Lo que había de un artículo al final del mes, de **toda** la empresa: su cantidad y su valor según el último movimiento
 * (cantidad en diezmilésimas, valor en centavos), lo que había en cada bodega y lo que iba en tránsito entre bodegas.
 * Lo que viaja sigue en la cantidad y el valor del artículo (§3.2).
 */
export interface ArticuloAlCorte {
  articuloId: string;
  tipoDeInventario: TipoDeInventario;
  cantidad: bigint;
  valor: bigint;
  porBodega: readonly CantidadEnBodega[];
  /** Por bodega de origen: lo que salió en un traslado y todavía no se recibe. */
  enTransito: readonly CantidadEnBodega[];
}

/** Un renglón de la foto del mes (`existencias_al_cierre`). */
export interface RenglonDelCierre {
  articuloId: string;
  bodegaId: string;
  tipoDeInventario: TipoDeInventario;
  enTransitoInterno: boolean;
  cantidad: bigint;
  /** Millonésimas de quetzal por unidad base: el costo del artículo en toda la empresa. */
  costoUnitario: bigint;
  /** Centavos. */
  valor: bigint;
}

export interface TotalesDelCierre {
  valorTotal: bigint;
  articulosConExistencia: number;
  porTipo: { tipoDeInventario: TipoDeInventario; valor: bigint }[];
}

interface Parte extends CantidadEnBodega {
  enTransito: boolean;
}

const suma = (valores: readonly bigint[]): bigint => valores.reduce((total, valor) => total + valor, 0n);

/** Las partes con cantidad, ordenadas por bodega (lo que viaja después de lo que está en la bodega): la última absorbe el redondeo. */
function partesDe(articulo: ArticuloAlCorte): Parte[] {
  const partes: Parte[] = [
    ...articulo.porBodega.map((parte) => ({ ...parte, enTransito: false })),
    ...articulo.enTransito.map((parte) => ({ ...parte, enTransito: true })),
  ].filter((parte) => parte.cantidad !== 0n);
  return partes.sort((a, b) => a.bodegaId.localeCompare(b.bodegaId) || Number(a.enTransito) - Number(b.enTransito));
}

interface ValorAReparto {
  valor: bigint;
  cantidades: readonly bigint[];
  total: bigint;
}

/** Reparte `valor` según las cantidades; todas menos la última se redondean y la última se lleva lo que sobra o falta. */
function repartir({ valor, cantidades, total }: ValorAReparto, mitadArriba: boolean): bigint[] {
  const parciales = cantidades.slice(0, -1).map((cantidad) => {
    const producto = cantidad * valor;
    return mitadArriba ? (2n * producto + total) / (2n * total) : producto / total;
  });
  return [...parciales, valor - suma(parciales)];
}

/** Mitad hacia arriba; si con tantas partes la última quedara en negativo, se reparte hacia abajo (la última no baja de cero). */
function valoresDe(reparto: ValorAReparto): bigint[] {
  const redondeado = repartir(reparto, true);
  return redondeado.at(-1)! < 0n ? repartir(reparto, false) : redondeado;
}

/** El costo del artículo en toda la empresa, en millonésimas por unidad, redondeado hacia arriba en la mitad. */
function costoUnitarioDe(valor: bigint, cantidad: bigint): bigint {
  const numerador = valor * 100_000_000n;
  return (2n * numerador + cantidad) / (2n * cantidad);
}

/**
 * Valúa un artículo al corte (§3.2): el valor del artículo se reparte entre sus bodegas y su renglón «En tránsito
 * interno» según la cantidad de cada una, al costo del artículo en toda la empresa; el último renglón absorbe el
 * redondeo para que la suma dé exactamente el valor del artículo. Un artículo sin existencia no tiene renglones.
 * @throws FotoDelCierreNoCuadra si las cantidades por bodega no suman la del artículo o alguna es negativa.
 */
export function valuarArticulo(articulo: ArticuloAlCorte): RenglonDelCierre[] {
  const { articuloId, tipoDeInventario, cantidad, valor } = articulo;
  if (cantidad <= 0n) return [];
  const partes = partesDe(articulo);
  const cantidades = partes.map((parte) => parte.cantidad);
  if (cantidades.some((parte) => parte < 0n) || suma(cantidades) !== cantidad)
    throw new FotoDelCierreNoCuadra(articuloId);
  const costoUnitario = costoUnitarioDe(valor, cantidad);
  const valores = valoresDe({ valor, cantidades, total: cantidad });
  return partes.map((parte, i) => ({
    articuloId,
    bodegaId: parte.bodegaId,
    tipoDeInventario,
    enTransitoInterno: parte.enTransito,
    cantidad: parte.cantidad,
    costoUnitario,
    valor: valores[i]!,
  }));
}

/** La foto de todos los artículos de la empresa al corte. */
export function valuarExistencias(articulos: readonly ArticuloAlCorte[]): RenglonDelCierre[] {
  return articulos.flatMap(valuarArticulo);
}

/** Valor total, artículos con existencia y valor por tipo de inventario (por nombre, para que la huella no dependa del orden). */
export function totalesDelCierre(renglones: readonly RenglonDelCierre[]): TotalesDelCierre {
  const porTipo = new Map<TipoDeInventario, bigint>();
  for (const { tipoDeInventario, valor } of renglones) {
    porTipo.set(tipoDeInventario, (porTipo.get(tipoDeInventario) ?? 0n) + valor);
  }
  return {
    valorTotal: suma(renglones.map((renglon) => renglon.valor)),
    articulosConExistencia: new Set(renglones.map((renglon) => renglon.articuloId)).size,
    porTipo: [...porTipo.entries()]
      .map(([tipoDeInventario, valor]) => ({ tipoDeInventario, valor }))
      .sort((a, b) => a.tipoDeInventario.localeCompare(b.tipoDeInventario)),
  };
}
