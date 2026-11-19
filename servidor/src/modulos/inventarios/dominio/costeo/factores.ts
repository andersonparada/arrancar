import { FactorInicialFaltante } from './errores.js';
import type { Factor } from './tipos.js';

const UNO: Factor = { numerador: 1n, denominador: 1n };

function mcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function reducir(factor: Factor): Factor {
  const divisor = mcd(factor.numerador, factor.denominador);
  return divisor <= 1n ? factor : { numerador: factor.numerador / divisor, denominador: factor.denominador / divisor };
}

/**
 * Factor exacto del promedio (§7.5): `f = Π (1 − q_s / C_s)` sobre las salidas desde que entró cada entrada,
 * como fracción de enteros (numerador `Π (C_s − q_s)`, denominador `Π C_s`) sin coma flotante. Solo sigue a las
 * entradas que reciben repartos. Las entradas posteriores y los traslados no lo cambian.
 * Una entrada con reparto que no aparece en el recorrido necesita su factor inicial: no se supone 1.
 */
export class SeguimientoDeFactores {
  private readonly factores = new Map<string, Factor>();
  private readonly objetivos: ReadonlySet<string>;

  constructor(objetivos: ReadonlySet<string>, iniciales: ReadonlyMap<string, Factor> = new Map()) {
    this.objetivos = objetivos;
    for (const id of objetivos) {
      const inicial = iniciales.get(id);
      if (inicial) this.factores.set(id, inicial);
    }
  }

  /** Una entrada que se registra en el recorrido empieza en 1: las salidas anteriores no la tocaron. */
  alEntrar(id: string): void {
    if (this.objetivos.has(id)) this.factores.set(id, UNO);
  }

  /** Una salida de `cantidad` cuando había `existenciaAntes` en el artículo. */
  alSalir(existenciaAntes: bigint, cantidad: bigint): void {
    if (existenciaAntes <= 0n || cantidad <= 0n) return;
    for (const [id, f] of this.factores) {
      const numerador = f.numerador * (existenciaAntes - cantidad);
      this.factores.set(id, reducir({ numerador, denominador: f.denominador * existenciaAntes }));
    }
  }

  /** Falla si la entrada recibe un reparto, no entra en el recorrido y no trae factor inicial. */
  de(id: string): Factor {
    const factor = this.factores.get(id);
    if (!factor) throw new FactorInicialFaltante(id);
    return factor;
  }

  todos(): ReadonlyMap<string, Factor> {
    return new Map(this.factores);
  }
}
