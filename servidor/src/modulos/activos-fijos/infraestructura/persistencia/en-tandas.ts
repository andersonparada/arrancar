/** Cuántas filas se insertan por sentencia: una capitalización de 200 unidades no arma una sola consulta enorme (R-15). */
const TAMANO_DE_TANDA = 100;

/** Parte una lista en tandas para insertarla de a poco dentro de la misma transacción. */
export function enTandas<Elemento>(lista: readonly Elemento[], tamano = TAMANO_DE_TANDA): Elemento[][] {
  const tandas: Elemento[][] = [];
  for (let inicio = 0; inicio < lista.length; inicio += tamano) tandas.push(lista.slice(inicio, inicio + tamano));
  return tandas;
}
