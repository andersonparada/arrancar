import { normalizarTexto } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { Cuenta } from '../servicios/cuentas.api';

/** Una cuenta con sus cuentas inferiores, en orden de código. */
export interface NodoDeCuenta {
  cuenta: Cuenta;
  hijas: NodoDeCuenta[];
}

/** Una fila de la nomenclatura tal como se dibuja: la cuenta, su sangría y si se puede plegar. */
export interface FilaDeCuenta {
  cuenta: Cuenta;
  profundidad: number;
  tieneHijas: boolean;
  abierta: boolean;
}

export interface FiltroDeCuentas {
  texto: string;
  /** Con `false`, las inactivas no se muestran. */
  conInactivas: boolean;
}

const porCodigo = (a: Cuenta, b: Cuenta): number => a.codigo.localeCompare(b.codigo, 'es', { numeric: true });

/** Arma el árbol desde la lista plana. Una cuenta cuya superior no llegó se trata como de primer nivel. */
export function armarArbol(cuentas: Cuenta[]): NodoDeCuenta[] {
  const nodos = new Map(cuentas.map((cuenta) => [cuenta.id, { cuenta, hijas: [] as NodoDeCuenta[] }]));
  const raices: NodoDeCuenta[] = [];
  for (const nodo of nodos.values()) {
    const padre = nodo.cuenta.padreId ? nodos.get(nodo.cuenta.padreId) : undefined;
    (padre ? padre.hijas : raices).push(nodo);
  }
  const ordenar = (lista: NodoDeCuenta[]): NodoDeCuenta[] => {
    lista.sort((a, b) => porCodigo(a.cuenta, b.cuenta));
    lista.forEach((nodo) => ordenar(nodo.hijas));
    return lista;
  };
  return ordenar(raices);
}

/** Los ids de todas las cuentas que tienen cuentas inferiores (para expandir todo). */
export function idsConHijas(arbol: NodoDeCuenta[]): string[] {
  return arbol.flatMap((nodo) => (nodo.hijas.length ? [nodo.cuenta.id, ...idsConHijas(nodo.hijas)] : []));
}

const coincide = (cuenta: Cuenta, texto: string): boolean =>
  normalizarTexto(`${cuenta.codigo} ${cuenta.nombre}`).includes(texto);

/** Los ids de las cuentas que se ven con el filtro: las que coinciden y las que las contienen. */
function idsVisibles(arbol: NodoDeCuenta[], filtro: FiltroDeCuentas): Set<string> {
  const texto = normalizarTexto(filtro.texto.trim());
  const visibles = new Set<string>();
  const recorrer = (nodo: NodoDeCuenta): boolean => {
    const hijasVisibles = nodo.hijas.map(recorrer).includes(true);
    const propia = (filtro.conInactivas || nodo.cuenta.activo) && (!texto || coincide(nodo.cuenta, texto));
    if (propia || hijasVisibles) visibles.add(nodo.cuenta.id);
    return visibles.has(nodo.cuenta.id);
  };
  arbol.forEach(recorrer);
  return visibles;
}

/**
 * Las filas que se dibujan: respeta lo plegado, salvo al buscar, que abre el camino hasta lo encontrado. Una cuenta
 * activa dentro de una inactiva se sigue viendo con su camino.
 */
export function filasVisibles(arbol: NodoDeCuenta[], abiertos: ReadonlySet<string>, filtro: FiltroDeCuentas) {
  const buscando = filtro.texto.trim() !== '';
  const visibles = idsVisibles(arbol, filtro);
  const filas: FilaDeCuenta[] = [];
  const recorrer = (nodos: NodoDeCuenta[], profundidad: number): void => {
    for (const nodo of nodos.filter((n) => visibles.has(n.cuenta.id))) {
      const hijas = nodo.hijas.filter((n) => visibles.has(n.cuenta.id));
      const abierta = hijas.length > 0 && (buscando || abiertos.has(nodo.cuenta.id));
      filas.push({ cuenta: nodo.cuenta, profundidad, tieneHijas: hijas.length > 0, abierta });
      if (abierta) recorrer(hijas, profundidad + 1);
    }
  };
  recorrer(arbol, 0);
  return filas;
}
