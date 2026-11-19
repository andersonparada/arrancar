/**
 * Orden dentro del día: primero las entradas, luego los valores y al final las salidas (§7.2). Las dos mitades
 * de un traslado son neutras para el costo: la de destino va con las entradas y la de origen con las salidas.
 */
export type TipoDeMovimiento = 'entrada' | 'traslado_de_entrada' | 'valor' | 'salida' | 'traslado_de_salida';

export type MetodoDeCosteo = 'promedio_ponderado' | 'peps';

/** Lo mínimo para ubicar un movimiento en el kardex. */
export interface PosicionEnKardex {
  readonly fecha: string; // AAAA-MM-DD
  readonly secuencia: number;
  readonly tipo: TipoDeMovimiento;
}

/** Reparto de un costo adicional o rebaja: la parte que le tocó a una entrada, que el motor divide en absorbido y a resultados. */
export interface RepartoDeCosto {
  readonly entradaId: string;
  /** Con signo: negativa en una rebaja. */
  readonly parte: bigint;
}

/** Devolución a proveedor: sale al costo unitario (millonésimas) de la entrada que devuelve (§7.4). */
export interface DevolucionAProveedor {
  readonly entradaId: string;
  readonly costoUnitario: bigint;
}

/**
 * Movimiento de la línea del costo de un artículo en la empresa. `cantidad` en diezmilésimas, `valor` en
 * centavos: el costo de la entrada, el ajuste de un movimiento de valor (con signo), y se ignora en la
 * salida (el motor lo calcula). `capaId` solo sirve a PEPS en un movimiento de valor sin `reparto`: la entrada que
 * recibe. Con `reparto` el motor calcula lo absorbido (§7.5) y se ignora `valor`. En los traslados `cantidad` va
 * en positivo y solo sirve para el costo informativo.
 */
export interface MovimientoDeCosto extends PosicionEnKardex {
  readonly id: string;
  readonly cantidad: bigint;
  readonly valor: bigint;
  readonly capaId?: string;
  readonly reparto?: RepartoDeCosto;
  /** Solo en salidas: una devolución a proveedor. */
  readonly devolucion?: DevolucionAProveedor;
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
  /**
   * Costo de la salida; en entradas y valores, el valor que aportan (lo absorbido si hay reparto); en un traslado,
   * el costo informativo (en positivo).
   */
  readonly costo: bigint;
  /**
   * Lo que va a resultados: la parte no absorbida de un reparto, o el residuo que una devolución saca del valor
   * además de su costo (VC-1).
   */
  readonly aResultados: bigint;
  readonly saldoCantidad: bigint;
  readonly saldoValor: bigint;
  readonly consumos: readonly ConsumoDeCapa[];
}

/** Fracción `numerador / denominador` de una entrada que sigue en existencia (promedio, §7.5). */
export interface Factor {
  readonly numerador: bigint;
  readonly denominador: bigint;
}

export interface EstadoDePromedio {
  readonly cantidad: bigint;
  readonly valor: bigint;
  /**
   * Factor de las entradas que reciben repartos, por id. Al recalcular desde un punto, trae el de las entradas
   * anteriores a él; las que no vengan se toman con factor 1 desde el inicio del recorrido.
   */
  readonly factores?: ReadonlyMap<string, Factor>;
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
