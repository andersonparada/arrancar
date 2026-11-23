import { avisoDePeriodoDeclarado, PeriodoDeclarado } from '../../errores.js';
import type { ControlDePeriodosParaVentas } from '../../puertos/puertos-de-documentos.js';

/**
 * Registrar, anular o eliminar en un mes declarado: con el control encendido se rechaza (`periodo_declarado`: hay que
 * reabrir el período en Libro de compras); apagado, solo avisa que habrá que rectificar. Toma el período con
 * `for share`, así declarar espera a que termine la operación en curso.
 * @returns los avisos del período.
 * @throws PeriodoDeclarado
 */
export async function revisarElPeriodo(control: ControlDePeriodosParaVentas, periodo: string): Promise<string[]> {
  const estado = await control.estadoDe(periodo, true);
  if (estado.bloquea) throw new PeriodoDeclarado(periodo);
  return estado.declarado ? [avisoDePeriodoDeclarado(periodo)] : [];
}
