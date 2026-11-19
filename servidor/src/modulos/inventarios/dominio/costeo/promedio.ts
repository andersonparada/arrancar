import { absorberConFactor } from './absorcion.js';
import { ExistenciaNegativa } from './errores.js';
import { costoUnitarioDe, proporcion, valorDe } from './escalas.js';
import { SeguimientoDeFactores } from './factores.js';
import { ordenarKardex } from './orden.js';
import type { EstadoDePromedio, MovimientoDeCosto, Recorrido, ResultadoDeMovimiento } from './tipos.js';

/** Costo de una salida de `cantidad`: si vacía la existencia se lleva el residuo del redondeo (§7.1). */
export function costoDeSalidaPromedio(estado: EstadoDePromedio, cantidad: bigint): bigint {
  return cantidad === estado.cantidad ? estado.valor : proporcion(estado.valor, cantidad, estado.cantidad);
}

interface Paso {
  readonly costo: bigint;
  readonly aResultados: bigint;
}

/** Estado móvil del promedio ponderado; cada movimiento lo hace avanzar y devuelve lo que calculó. */
class CalculadorDePromedio {
  private cantidad: bigint;
  private valor: bigint;
  private readonly factores: SeguimientoDeFactores;

  constructor(inicial: EstadoDePromedio, objetivos: ReadonlySet<string>) {
    this.cantidad = inicial.cantidad;
    this.valor = inicial.valor;
    this.factores = new SeguimientoDeFactores(objetivos, inicial.factores);
  }

  estado(): EstadoDePromedio {
    return { cantidad: this.cantidad, valor: this.valor, factores: this.factores.todos() };
  }

  aplicar(m: MovimientoDeCosto): ResultadoDeMovimiento {
    const paso = this.mover(m);
    return {
      id: m.id,
      costo: paso.costo,
      aResultados: paso.aResultados,
      saldoCantidad: this.cantidad,
      saldoValor: this.valor,
      consumos: [],
    };
  }

  private mover(m: MovimientoDeCosto): Paso {
    if (m.tipo === 'entrada') return this.entrar(m);
    if (m.tipo === 'valor') return this.ajustarValor(m);
    if (m.tipo === 'salida') return this.sacar(m);
    return { costo: this.costoInformativo(m.cantidad), aResultados: 0n };
  }

  private entrar(m: MovimientoDeCosto): Paso {
    this.cantidad += m.cantidad;
    this.valor += m.valor;
    this.factores.alEntrar(m.id);
    return { costo: m.valor, aResultados: 0n };
  }

  private ajustarValor(m: MovimientoDeCosto): Paso {
    if (!m.reparto) {
      this.valor += m.valor;
      return { costo: m.valor, aResultados: 0n };
    }
    const factor = this.cantidad === 0n ? { numerador: 0n, denominador: 1n } : this.factores.de(m.reparto.entradaId);
    const a = absorberConFactor(m.reparto.parte, factor, this.valor);
    this.valor += a.absorbido;
    return { costo: a.absorbido, aResultados: a.aResultados };
  }

  private sacar(m: MovimientoDeCosto): Paso {
    if (m.cantidad > this.cantidad)
      throw new ExistenciaNegativa(m.fecha, m.cantidad - this.cantidad, { movimientoId: m.id });
    const costo = this.costoDeSalida(m);
    this.factores.alSalir(this.cantidad, m.cantidad);
    this.cantidad -= m.cantidad;
    this.valor -= costo;
    return { costo, aResultados: this.vaciarResiduo() };
  }

  /** Una devolución sale al costo de su entrada, sin pasar de lo que vale el artículo (§7.4). */
  private costoDeSalida(m: MovimientoDeCosto): bigint {
    if (!m.devolucion) return costoDeSalidaPromedio({ cantidad: this.cantidad, valor: this.valor }, m.cantidad);
    const deLaEntrada = valorDe(m.devolucion.costoUnitario, m.cantidad);
    return deLaEntrada < this.valor ? deLaEntrada : this.valor;
  }

  /** Sin existencia no puede quedar valor: el residuo de una devolución va a resultados (VC-1). */
  private vaciarResiduo(): bigint {
    if (this.cantidad !== 0n || this.valor === 0n) return 0n;
    const residuo = this.valor;
    this.valor = 0n;
    return residuo;
  }

  private costoInformativo(cantidad: bigint): bigint {
    return this.cantidad > 0n ? valorDe(costoUnitarioDe(this.valor, this.cantidad), cantidad) : 0n;
  }
}

function objetivosDeReparto(movimientos: readonly MovimientoDeCosto[]): Set<string> {
  const ids = new Set<string>();
  for (const m of movimientos) if (m.reparto) ids.add(m.reparto.entradaId);
  return ids;
}

/**
 * Recorre en el orden del kardex los movimientos que siguen a `inicial` (el saldo del movimiento vigente
 * anterior, o cero) con promedio ponderado móvil. Lanza `ExistenciaNegativa` si en algún punto no alcanza.
 * Los movimientos de valor con `reparto` recalculan lo absorbido con el factor exacto (§7.5); por eso un cambio
 * en una salida anterior cambia también los repartos al recorrer de nuevo. `entradasSeguidas` son las entradas
 * anteriores al punto de partida cuyo factor se lleva y se devuelve en `estado.factores`.
 */
export function recalcularPromedio(
  movimientos: readonly MovimientoDeCosto[],
  inicial: EstadoDePromedio = { cantidad: 0n, valor: 0n },
  entradasSeguidas: readonly string[] = [],
): Recorrido<EstadoDePromedio> {
  const objetivos = objetivosDeReparto(movimientos);
  for (const id of entradasSeguidas) objetivos.add(id);
  const calculador = new CalculadorDePromedio(inicial, objetivos);
  const resultados = ordenarKardex(movimientos).map((m) => calculador.aplicar(m));
  return { resultados, estado: calculador.estado() };
}
