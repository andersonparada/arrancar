import type { NodoDeParcela } from '../../servicios/parcelas.api';
import { centesimasATexto, textoACentesimas } from '../superficie/edicion-de-superficie';

/** Una parcela en la lista del árbol: a qué profundidad se dibuja y si sus subparcelas están a la vista. */
export interface FilaDelArbol {
  nodo: NodoDeParcela;
  /** 0 para las de nivel 1 de la lista (o las que quedan sin madre al filtrar). */
  profundidad: number;
  tieneHijas: boolean;
  colapsada: boolean;
  /** La superficie total que se muestra en su tarjeta: la propia o, si no tiene medición, la suma de sus subparcelas. */
  superficieTotalM2: string | null;
  /** Si `superficieTotalM2` es la suma de las subparcelas activas y no una medición propia. */
  esSumaDeSubparcelas: boolean;
}

/** Las parcelas de una localidad, ya en el orden en que se dibujan. */
export interface GrupoDeLocalidad {
  localidadId: string;
  localidadNombre: string;
  filas: FilaDelArbol[];
  /** Cuántas parcelas hay en la localidad (con todas sus subparcelas, estén a la vista o no). */
  cantidad: number;
  /** Superficie total de la localidad en m² (texto con dos decimales), o `null` si ninguna tiene medición. */
  superficieTotalM2: string | null;
}

const sumar = (valores: Array<number | null>): number | null => {
  const conValor = valores.filter((valor): valor is number => valor !== null);
  return conValor.length ? conValor.reduce((suma, valor) => suma + valor, 0) : null;
};

/** La superficie de una parcela en centésimas de m²: la suya o, sin medición propia, la suma de sus subparcelas activas. */
function superficieMostrada(nodo: NodoDeParcela): number | null {
  if (nodo.superficieTotalM2 !== null) return textoACentesimas(nodo.superficieTotalM2);
  return sumar(nodo.hijas.map(superficieDelNodo));
}

/**
 * La superficie que una parcela aporta al total, en centésimas de m²: la suya, o, si no tiene medición propia, la suma
 * de sus subparcelas (dictamen §3.2). Las inactivas no aportan nada: al reorganizar se inactiva una parcela y se crea
 * otra, y contar las dos duplicaría la superficie. `null` si no hay medición que contar.
 */
export function superficieDelNodo(nodo: NodoDeParcela): number | null {
  return nodo.activo ? superficieMostrada(nodo) : null;
}

const contarNodos = (nodo: NodoDeParcela): number => 1 + nodo.hijas.reduce((suma, hija) => suma + contarNodos(hija), 0);

/** Las filas de un nodo y, si no está colapsado, las de sus subparcelas debajo, cada una un nivel más adentro. */
function filasDe(nodo: NodoDeParcela, profundidad: number, colapsadas: ReadonlySet<string>): FilaDelArbol[] {
  const colapsada = colapsadas.has(nodo.id);
  const suma = nodo.superficieTotalM2 === null ? superficieMostrada(nodo) : null;
  const fila: FilaDelArbol = {
    nodo,
    profundidad,
    tieneHijas: nodo.hijas.length > 0,
    colapsada,
    superficieTotalM2: suma === null ? nodo.superficieTotalM2 : centesimasATexto(suma),
    esSumaDeSubparcelas: suma !== null,
  };
  if (colapsada) return [fila];
  return [fila, ...nodo.hijas.flatMap((hija) => filasDe(hija, profundidad + 1, colapsadas))];
}

/** Agrupa las raíces del árbol por localidad, en el orden en que llegaron, con sus totales. */
export function agruparPorLocalidad(raices: NodoDeParcela[], colapsadas: ReadonlySet<string>): GrupoDeLocalidad[] {
  const porLocalidad = new Map<string, NodoDeParcela[]>();
  for (const raiz of raices) porLocalidad.set(raiz.localidadId, [...(porLocalidad.get(raiz.localidadId) ?? []), raiz]);
  return [...porLocalidad.values()].map((nodos) => {
    const total = sumar(nodos.map(superficieDelNodo));
    return {
      localidadId: nodos[0]!.localidadId,
      localidadNombre: nodos[0]!.localidadNombre,
      filas: nodos.flatMap((nodo) => filasDe(nodo, 0, colapsadas)),
      cantidad: nodos.reduce((suma, nodo) => suma + contarNodos(nodo), 0),
      superficieTotalM2: total === null ? null : centesimasATexto(total),
    };
  });
}

/** Los ids de las parcelas que tienen subparcelas: lo que se colapsa con «Contraer todo». */
export function idsConHijas(raices: NodoDeParcela[]): string[] {
  return raices.flatMap((nodo) => (nodo.hijas.length ? [nodo.id, ...idsConHijas(nodo.hijas)] : []));
}
