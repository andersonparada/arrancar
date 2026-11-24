import { sumarDecimales } from '../compartido/cantidades';
import type { Existencia } from '../../servicios/existencias.api';

/** Lo que muestra la tarjeta de un artículo: el total y lo que hay en cada bodega. */
export interface ArticuloConExistencias {
  articuloId: string;
  codigo: string;
  nombre: string;
  tipoDeInventario: Existencia['tipoDeInventario'];
  unidadBaseNombre: string;
  cantidadTotal: string;
  /** `null` si el usuario no ve costos. */
  valorTotal: string | null;
  costoUnitario: string | null;
  /** Una fila por bodega (los lotes de una misma bodega ya vienen sumados). */
  bodegas: { bodegaId: string; bodegaNombre: string; cantidad: string }[];
  /** Todas las filas por bodega y lote, para la ficha. */
  filas: Existencia[];
}

const porTexto = (a: string, b: string) => a.localeCompare(b, 'es');

function resumirBodegas(filas: Existencia[]): ArticuloConExistencias['bodegas'] {
  const porBodega = new Map<string, Existencia[]>();
  for (const fila of filas) porBodega.set(fila.bodegaId, [...(porBodega.get(fila.bodegaId) ?? []), fila]);
  return [...porBodega.values()]
    .map((delaBodega) => ({
      bodegaId: delaBodega[0]!.bodegaId,
      bodegaNombre: delaBodega[0]!.bodegaNombre,
      cantidad: sumarDecimales(
        delaBodega.map((fila) => fila.cantidad),
        4,
      )!,
    }))
    .sort((a, b) => porTexto(a.bodegaNombre, b.bodegaNombre));
}

const sumaDeCantidades = (filas: Existencia[]) =>
  sumarDecimales(
    filas.map((fila) => fila.cantidad),
    4,
  )!;

function armarArticulo(filas: Existencia[]): ArticuloConExistencias {
  const [primera] = filas as [Existencia, ...Existencia[]];
  return {
    articuloId: primera.articuloId,
    codigo: primera.articuloCodigo,
    nombre: primera.articuloNombre,
    tipoDeInventario: primera.tipoDeInventario,
    unidadBaseNombre: primera.unidadBaseNombre,
    cantidadTotal: sumaDeCantidades(filas),
    valorTotal: sumarDecimales(
      filas.map((fila) => fila.valor),
      2,
    ),
    costoUnitario: primera.costoUnitario,
    bodegas: resumirBodegas(filas),
    filas,
  };
}

/** Junta las filas por bodega y lote en un registro por artículo, ordenados por nombre. */
export function agruparPorArticulo(existencias: Existencia[]): ArticuloConExistencias[] {
  const porArticulo = new Map<string, Existencia[]>();
  for (const existencia of existencias) {
    porArticulo.set(existencia.articuloId, [...(porArticulo.get(existencia.articuloId) ?? []), existencia]);
  }
  return [...porArticulo.values()].map(armarArticulo).sort((a, b) => porTexto(a.nombre, b.nombre));
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Los artículos cuyo código o nombre contienen lo escrito (sin importar mayúsculas ni tildes). */
export function filtrarPorTexto(articulos: ArticuloConExistencias[], texto: string): ArticuloConExistencias[] {
  const buscado = normalizar(texto.trim());
  if (!buscado) return articulos;
  return articulos.filter((a) => normalizar(`${a.codigo} ${a.nombre}`).includes(buscado));
}

/** ¿El artículo no tiene nada (solo aparece si se pidió incluir lo que está en cero)? */
export const estaSinExistencia = (articulo: ArticuloConExistencias): boolean => Number(articulo.cantidadTotal) <= 0;

/** El valor total de lo que se ve en la lista, o `null` si el usuario no ve costos. */
export const valorDeLaLista = (articulos: ArticuloConExistencias[]): string | null =>
  sumarDecimales(
    articulos.map((a) => a.valorTotal),
    2,
  );
