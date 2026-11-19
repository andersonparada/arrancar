import { CostoManualRequerido } from './errores.js';
import { costoUnitarioDe, valorDe } from './escalas.js';
import type { EstadoDePromedio, MetodoDeCosteo } from './tipos.js';

export interface DatosDeSobrante {
  readonly metodo: MetodoDeCosteo;
  readonly cantidad: bigint;
  /** Promedio: el estado del artículo en la fecha del ajuste. */
  readonly estado: EstadoDePromedio;
  /**
   * Costo unitario (millonésimas) ajustado de la última entrada con costo real (`costoAjustadoDeLaUltimaEntrada`):
   * se usa con PEPS y con promedio cuando no hay existencia (V-5).
   */
  readonly costoDeLaUltimaEntrada?: bigint;
  /** Costo unitario escrito a mano, para cuando no hay referencia. */
  readonly costoManual?: bigint;
}

function referenciaDelMetodo(datos: DatosDeSobrante): bigint | undefined {
  if (datos.metodo === 'promedio_ponderado' && datos.estado.cantidad > 0n) {
    return costoUnitarioDe(datos.estado.valor, datos.estado.cantidad);
  }
  return datos.costoDeLaUltimaEntrada;
}

/** Costo unitario con que entra un sobrante: promedio vigente (promedio con existencia) o última entrada con costo real (§7.4). */
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
