import type { PaginaDeProveedoresPorPagar, ProveedorPorPagar } from '../../servicios/tipos-de-pagos';

/** Tope de páginas, por si el servidor nunca dejara de devolver elementos. */
const MAXIMO_DE_PAGINAS = 50;

/**
 * Junta todas las páginas de proveedores por pagar: el selector filtra en el navegador, así que necesita la lista
 * completa y no solo la primera página.
 */
export async function juntarProveedoresPorPagar(
  traerPagina: (pagina: number) => Promise<PaginaDeProveedoresPorPagar>,
): Promise<ProveedorPorPagar[]> {
  const todos: ProveedorPorPagar[] = [];
  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
    const { elementos, total } = await traerPagina(pagina);
    todos.push(...elementos);
    if (elementos.length === 0 || todos.length >= total) break;
  }
  return todos;
}
