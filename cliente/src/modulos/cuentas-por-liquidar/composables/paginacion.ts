export const paginasEnTotal = (total: number, limite: number): number => Math.max(1, Math.ceil(total / limite));

/** «1 a 50 de 120» para el pie de la lista. */
export function rangoMostrado(pagina: number, limite: number, total: number): string {
  if (total === 0) return '0 de 0';
  const desde = (pagina - 1) * limite + 1;
  return `${desde} a ${Math.min(pagina * limite, total)} de ${total}`;
}
