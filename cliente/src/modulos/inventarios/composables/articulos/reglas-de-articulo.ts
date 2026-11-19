import type { Articulo, TipoDeInventario } from '../../servicios/articulos.api';
import type { Categoria } from '../../servicios/categorias.api';
import type { EdicionDeArticulo } from './edicion-de-articulo';

/** Si se apaga «Maneja lotes», el vencimiento tampoco aplica (el servidor lo exige igual). */
export function aplicarManejaLotes(edicion: EdicionDeArticulo): void {
  if (!edicion.manejaLotes) edicion.manejaVencimiento = false;
}

/** Controlar el vencimiento exige llevar lotes: al encenderlo, se enciende «Maneja lotes». */
export function aplicarManejaVencimiento(edicion: EdicionDeArticulo): void {
  if (edicion.manejaVencimiento) edicion.manejaLotes = true;
}

/** El tipo de inventario que propone la categoría; sin categoría o sin cambio, el que ya tenía. */
export function tipoPropuestoPor(
  categorias: readonly Categoria[],
  categoriaId: string | null,
  actual: TipoDeInventario,
): TipoDeInventario {
  const categoria = categorias.find((candidata) => candidata.id === categoriaId);
  return categoria?.tipoDeInventarioPorOmision ?? actual;
}

/** Quita tildes y mayúsculas para buscar. */
const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Los artículos cuyo código, nombre o código de barras contienen lo escrito (sin tildes ni mayúsculas). */
export function filtrarArticulos(articulos: readonly Articulo[], busqueda: string): Articulo[] {
  const buscado = normalizar(busqueda.trim());
  if (!buscado) return [...articulos];
  return articulos.filter((articulo) =>
    [articulo.codigo, articulo.nombre, articulo.codigoDeBarras ?? ''].some((texto) =>
      normalizar(texto).includes(buscado),
    ),
  );
}
