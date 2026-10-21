import type { DteRecibido } from './dte-recibido.js';
import { DteAnuladoEnLaSat, DteNoEstaPendiente, MontosEnColumnasDesconocidas } from './errores-de-bandeja.js';
import { columnasDesconocidasConMonto } from './montos-en-columnas-desconocidas.js';

/**
 * Lo que se exige de la fila misma para confirmarla en lote: pendiente, vigente en la SAT y sin montos en columnas que el
 * mapa no conoce (esos se registran en el formulario, donde se ven).
 * @throws DteNoEstaPendiente, DteAnuladoEnLaSat o MontosEnColumnasDesconocidas.
 */
export function exigirConfirmable(dte: DteRecibido, encabezadosNoReconocidos: readonly string[]): void {
  const datos = dte.instantanea();
  if (datos.estado !== 'pendiente') throw new DteNoEstaPendiente(datos.estado);
  if (datos.estadoSat === 'anulado') throw new DteAnuladoEnLaSat();
  const columnas = columnasDesconocidasConMonto(datos.filaOriginal, encabezadosNoReconocidos);
  if (columnas.length > 0) throw new MontosEnColumnasDesconocidas(columnas);
}
