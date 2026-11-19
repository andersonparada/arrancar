/** Cuántas filas van por sentencia: un artículo con miles de movimientos no arma una consulta enorme. */
const TAMANO_DE_TANDA = 500;

/** Parte una lista en tandas para insertarla o actualizarla de a poco dentro de la misma transacción. */
export function enTandas<Elemento>(lista: readonly Elemento[], tamano = TAMANO_DE_TANDA): Elemento[][] {
  const tandas: Elemento[][] = [];
  for (let inicio = 0; inicio < lista.length; inicio += tamano) tandas.push(lista.slice(inicio, inicio + tamano));
  return tandas;
}
