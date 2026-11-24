import type { Parcela } from '../../servicios/parcelas.api';

/**
 * Las parcelas en el orden del árbol: cada madre seguida de sus subparcelas, a cualquier profundidad (P-1, P-1-A,
 * P-2, P-2-A). Respeta el orden en que llegan entre hermanas. Una parcela cuya madre no está en la lista (por ejemplo
 * porque está inactiva) se trata como de primer nivel.
 */
export function ordenarComoArbol(parcelas: Parcela[]): Parcela[] {
  const ids = new Set(parcelas.map(({ id }) => id));
  const hijasDe = new Map<string | null, Parcela[]>();
  for (const parcela of parcelas) {
    const madre = parcela.parcelaMadreId && ids.has(parcela.parcelaMadreId) ? parcela.parcelaMadreId : null;
    hijasDe.set(madre, [...(hijasDe.get(madre) ?? []), parcela]);
  }
  const recorrer = (madre: string | null): Parcela[] =>
    (hijasDe.get(madre) ?? []).flatMap((parcela) => [parcela, ...recorrer(parcela.id)]);
  return recorrer(null);
}
