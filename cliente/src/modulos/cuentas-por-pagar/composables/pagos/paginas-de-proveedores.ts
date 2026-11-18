import type { PaginaDeProveedoresPorPagar, ProveedorPorPagar } from '../../servicios/tipos-de-pagos';

/** Tope de páginas, por si el servidor nunca dejara de devolver elementos. */
const MAXIMO_DE_PAGINAS = 50;

export interface ProveedoresJuntados {
  proveedores: ProveedorPorPagar[];
  /** Verdadero si se llegó al tope de páginas y todavía faltaban proveedores. */
  incompleta: boolean;
}

/** El aviso cuando la lista quedó incompleta. */
export const TEXTO_DE_LISTA_INCOMPLETA =
  'La lista de proveedores está incompleta: hay demasiados para mostrarlos todos. Escriba el nombre del proveedor en el buscador o use «Pagar» desde su contraseña.';

/**
 * Junta todas las páginas de proveedores por pagar: el selector filtra en el navegador, así que necesita la lista
 * completa y no solo la primera página.
 */
export async function juntarProveedoresPorPagar(
  traerPagina: (pagina: number) => Promise<PaginaDeProveedoresPorPagar>,
): Promise<ProveedoresJuntados> {
  const todos: ProveedorPorPagar[] = [];
  let total = 0;
  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
    const respuesta = await traerPagina(pagina);
    const elementos = respuesta.elementos;
    total = respuesta.total;
    todos.push(...elementos);
    if (elementos.length === 0 || todos.length >= total) break;
  }
  return { proveedores: todos, incompleta: todos.length < total };
}
