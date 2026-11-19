import { CostoManualRequerido } from './errores.js';
import { costoUnitarioDe, valorDe } from './escalas.js';
import type { EstadoDePromedio, MetodoDeCosteo } from './tipos.js';

export interface DatosDeSobrante {
  readonly metodo: MetodoDeCosteo;
  readonly cantidad: bigint;
  /** Promedio: el estado del artículo en la fecha del ajuste. */
  readonly estado: EstadoDePromedio;
  /** PEPS: costo unitario (millonésimas) de la última entrada del artículo, si hubo. */
  readonly costoDeLaUltimaEntrada?: bigint;
  /** Costo unitario escrito a mano, para cuando no hay referencia. */
  readonly costoManual?: bigint;
}

function referenciaDelMetodo(datos: DatosDeSobrante): bigint | undefined {
  if (datos.metodo === 'peps') return datos.costoDeLaUltimaEntrada;
  return datos.estado.cantidad > 0n ? costoUnitarioDe(datos.estado.valor, datos.estado.cantidad) : undefined;
}

/** Costo unitario con que entra un sobrante: promedio vigente (promedio) o última entrada (PEPS) (§7.4). */
export function costoUnitarioDeSobrante(datos: DatosDeSobrante): bigint {
  const costo = referenciaDelMetodo(datos) ?? datos.costoManual;
  if (costo === undefined) throw new CostoManualRequerido();
  return costo;
}

/**
 * Valor en centavos del sobrante. El faltante no necesita función propia: es una salida más y el motor
 * le calcula el costo del método.
 */
export function valorDeSobrante(datos: DatosDeSobrante): bigint {
  return valorDe(costoUnitarioDeSobrante(datos), datos.cantidad);
}
