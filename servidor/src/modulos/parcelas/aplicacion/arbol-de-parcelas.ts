import type { NodoDeParcela, ParcelaDto } from './dto/parcela.dto.js';

/**
 * Arma el árbol de parcelas: las de nivel 1 (o cuya madre no está en la lista, por un filtro) son las raíces, y cada
 * una lleva sus subparcelas en el orden en que llegaron.
 */
export function armarArbolDeParcelas(parcelas: readonly ParcelaDto[]): NodoDeParcela[] {
  const nodos = new Map<string, NodoDeParcela>(parcelas.map((parcela) => [parcela.id, { ...parcela, hijas: [] }]));
  const raices: NodoDeParcela[] = [];
  for (const nodo of nodos.values()) {
    const madre = nodo.parcelaMadreId ? nodos.get(nodo.parcelaMadreId) : undefined;
    if (madre) madre.hijas.push(nodo);
    else raices.push(nodo);
  }
  return raices;
}
