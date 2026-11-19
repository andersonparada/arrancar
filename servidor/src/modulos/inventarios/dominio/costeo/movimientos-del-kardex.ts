import type { TipoDeMovimientoGuardado } from '../movimiento.js';
import type { MovimientoDeCantidad } from './cantidades-por-clave.js';
import type { MovimientoDeCosto, TipoDeMovimiento } from './tipos.js';

/**
 * Un movimiento tal como está guardado en el kardex (§5.10), en enteros: cantidades en diezmilésimas con signo, costos
 * unitarios en millonésimas y dinero en centavos con signo.
 */
export interface MovimientoDelKardex {
  readonly id: string;
  readonly documentoId: string;
  readonly articuloId: string;
  readonly bodegaId: string | null;
  readonly loteId: string | null;
  readonly fecha: string;
  readonly secuencia: number;
  readonly tipo: TipoDeMovimientoGuardado;
  readonly cantidad: bigint;
  readonly costoTotal: bigint;
  readonly costoUnitario: bigint;
  /** Si el método calcula su costo (lo que un recálculo puede cambiar). */
  readonly costoDelMetodo: boolean;
  readonly saldoCantidad: bigint;
  readonly saldoValor: bigint;
  readonly montoAResultados: bigint;
}

/** El tipo del motor: la mitad de un traslado es de entrada o de salida según el signo de su cantidad. */
export function tipoParaElMotor(m: Pick<MovimientoDelKardex, 'tipo' | 'cantidad'>): TipoDeMovimiento {
  if (m.tipo !== 'traslado') return m.tipo;
  return m.cantidad > 0n ? 'traslado_de_entrada' : 'traslado_de_salida';
}

const magnitud = (cantidad: bigint): bigint => (cantidad < 0n ? -cantidad : cantidad);

/** Lo que el motor de costeo necesita de un movimiento: su posición, su cantidad en positivo y lo que aporta. */
export function aMovimientoDeCosto(m: MovimientoDelKardex): MovimientoDeCosto {
  return {
    id: m.id,
    fecha: m.fecha,
    secuencia: m.secuencia,
    tipo: tipoParaElMotor(m),
    cantidad: magnitud(m.cantidad),
    valor: m.tipo === 'entrada' || m.tipo === 'valor' ? m.costoTotal : 0n,
  };
}

/** Lo que la revisión de cantidades por bodega y lote necesita; los de valor no tienen bodega y no cuentan. */
export function aMovimientoDeCantidad(m: MovimientoDelKardex): MovimientoDeCantidad {
  return {
    id: m.id,
    fecha: m.fecha,
    secuencia: m.secuencia,
    tipo: tipoParaElMotor(m),
    clave: `${m.bodegaId ?? ''}|${m.loteId ?? ''}`,
    cantidad: magnitud(m.cantidad),
  };
}
