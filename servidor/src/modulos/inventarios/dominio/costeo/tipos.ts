/** Orden dentro del día: primero las entradas, luego los valores y al final las salidas (§7.2). */
export type TipoDeMovimiento = 'entrada' | 'valor' | 'salida';

export type MetodoDeCosteo = 'promedio_ponderado' | 'peps';

/** Lo mínimo para ubicar un movimiento en el kardex. */
export interface PosicionEnKardex {
  readonly fecha: string; // AAAA-MM-DD
  readonly secuencia: number;
  readonly tipo: TipoDeMovimiento;
}

/**
 * Movimiento de la línea del costo de un artículo en la empresa. `cantidad` en diezmilésimas, `valor` en
 * centavos: el costo de la entrada, el ajuste de un movimiento de valor (con signo), y se ignora en la
 * salida (el motor lo calcula). `capaId` solo sirve a PEPS en los movimientos de valor: la entrada que reciben.
 */
export interface MovimientoDeCosto extends PosicionEnKardex {
  readonly id: string;
  readonly cantidad: bigint;
  readonly valor: bigint;
  readonly capaId?: string;
}

/** De qué capa salió cuánto (PEPS). */
export interface ConsumoDeCapa {
  readonly capaId: string;
  readonly cantidad: bigint;
  readonly valor: bigint;
}

/** Lo que el motor calcula para cada movimiento y el saldo del artículo justo después de él. */
export interface ResultadoDeMovimiento {
  readonly id: string;
  /** Costo de la salida; en entradas y valores, el valor que aportan. */
  readonly costo: bigint;
  readonly saldoCantidad: bigint;
  readonly saldoValor: bigint;
  readonly consumos: readonly ConsumoDeCapa[];
}

export interface EstadoDePromedio {
  readonly cantidad: bigint;
  readonly valor: bigint;
}

/** Capa de una entrada (PEPS); su `id` es el del movimiento de entrada. */
export interface Capa {
  readonly id: string;
  readonly fecha: string;
  readonly secuencia: number;
  readonly cantidadInicial: bigint;
  readonly cantidadRestante: bigint;
  readonly valorRestante: bigint;
}

/** Resultado de recorrer una secuencia: lo calculado y cómo queda el artículo al final. */
export interface Recorrido<E> {
  readonly resultados: readonly ResultadoDeMovimiento[];
  readonly estado: E;
}
