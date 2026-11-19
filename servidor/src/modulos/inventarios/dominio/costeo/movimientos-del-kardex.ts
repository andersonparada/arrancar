import type { TipoDeMovimientoGuardado } from '../movimiento.js';
import type { MovimientoDeCantidad } from './cantidades-por-clave.js';
import { CapaNoDisponible } from './errores.js';
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
  /** La entrada que devuelve una devolución o que recibe la parte de una rebaja. */
  readonly movimientoDeOrigenId?: string | null;
  /** La línea del Libro de compras de donde viene (recepción, devolución, rebaja). */
  readonly lineaDeCompraId?: string | null;
  /** El documento del libro (factura o nota) de la línea. */
  readonly documentoDeCompraId?: string | null;
  /** Solo en el movimiento de valor de un reparto: lo que le toca a su entrada (con signo, es fijo). */
  readonly parteDeReparto?: bigint | null;
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

/** Un movimiento de valor que recibe la parte de un reparto: el motor calcula cuánto absorbe la existencia. */
export const esDeReparto = (m: MovimientoDelKardex): boolean =>
  m.tipo === 'valor' && !!m.movimientoDeOrigenId && typeof m.parteDeReparto === 'bigint';

/** Una salida que devuelve una entrada: sale a su costo, no al del método. */
export const esDevolucion = (m: MovimientoDelKardex): boolean => m.tipo === 'salida' && !!m.movimientoDeOrigenId;

/** Lo que el motor necesita de lo guardado: además de la posición y la cantidad, el reparto o la devolución. */
function extrasDeCosto(m: MovimientoDelKardex, porId: ReadonlyMap<string, MovimientoDelKardex>) {
  if (esDeReparto(m)) return { reparto: { entradaId: m.movimientoDeOrigenId!, parte: m.parteDeReparto! } };
  if (!esDevolucion(m)) return {};
  const entrada = porId.get(m.movimientoDeOrigenId!);
  if (!entrada) throw new CapaNoDisponible(m.movimientoDeOrigenId!);
  return { devolucion: { entradaId: entrada.id, costoUnitario: entrada.costoUnitario } };
}

/** Todos los movimientos vigentes del artículo, listos para el motor (con repartos y devoluciones). */
export function aMovimientosDeCosto(guardados: readonly MovimientoDelKardex[]): MovimientoDeCosto[] {
  const porId = new Map(guardados.map((m) => [m.id, m]));
  return guardados.map((m) => ({ ...aMovimientoDeCosto(m), ...extrasDeCosto(m, porId) }));
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
