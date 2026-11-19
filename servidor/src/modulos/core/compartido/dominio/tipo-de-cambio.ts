import { DatoInvalido } from './errores.js';
import { ObjetoValor } from './objeto-valor.js';

/** Decimales con que se guardan los tipos de cambio (`numeric(16,8)`). */
const ESCALA = 8;
const FACTOR = 10n ** BigInt(ESCALA);
/** El mayor valor que cabe en `numeric(16,8)`: 99999999.99999999, escalado × 10⁸. */
const MAXIMO_ESCALADO = 10n ** 16n - 1n;
/** El mayor monto de `numeric(14,2)` en centavos: 999,999,999,999.99. */
const MAXIMO_EN_CENTAVOS = 99_999_999_999_999n;
const FORMATO = /^(\d{1,8})(?:\.(\d{1,8}))?$/;

export class TipoDeCambioInvalido extends DatoInvalido {
  readonly codigo = 'tipo_de_cambio_invalido';

  constructor(texto: string) {
    super(`«${texto}» no es un tipo de cambio válido: debe ser mayor que cero, con hasta 8 decimales.`);
  }
}

/** El monto convertido no cabe en `numeric(14,2)`, o el monto de partida no es un entero de centavos. */
export class ConversionFueraDeRango extends DatoInvalido {
  readonly codigo = 'conversion_fuera_de_rango';

  constructor() {
    super('El monto convertido es demasiado grande.');
  }
}

/** Cociente redondeado desde la mitad (alejándose de cero), con aritmética entera. El divisor es positivo. */
function dividirRedondeando(numerador: bigint, divisor: bigint): bigint {
  const absoluto = numerador < 0n ? -numerador : numerador;
  const cociente = (absoluto * 2n + divisor) / (divisor * 2n);
  return numerador < 0n ? -cociente : cociente;
}

function aEntero(centavos: number): bigint {
  if (!Number.isSafeInteger(centavos)) throw new ConversionFueraDeRango();
  return BigInt(centavos);
}

function aCentavosEnteros(valor: bigint): number {
  const absoluto = valor < 0n ? -valor : valor;
  if (absoluto > MAXIMO_EN_CENTAVOS) throw new ConversionFueraDeRango();
  return Number(valor);
}

/**
 * Tipo de cambio: quetzales por una unidad de la moneda extranjera, con hasta 8 decimales. Guarda el valor como entero
 * escalado × 10⁸ (`bigint`), nunca como `number`, y convierte centavos con aritmética entera y redondeo desde la mitad.
 * Viaja como texto en la API y en la base.
 */
export class TipoDeCambio extends ObjetoValor<string> {
  private constructor(
    valor: string,
    /** El tipo × 10⁸ (`7.64489` es `764489000n`). */
    readonly escalado: bigint,
  ) {
    super(valor);
  }

  /** @throws TipoDeCambioInvalido si no es un decimal positivo de hasta 8 enteros y 8 decimales. */
  static crear(texto: string): TipoDeCambio {
    const partes = FORMATO.exec(texto.trim());
    if (!partes) throw new TipoDeCambioInvalido(texto);
    const escalado = BigInt(partes[1]! + (partes[2] ?? '').padEnd(ESCALA, '0'));
    if (escalado <= 0n || escalado > MAXIMO_ESCALADO) throw new TipoDeCambioInvalido(texto);
    return TipoDeCambio.deEscalado(escalado);
  }

  /** El tipo desde su entero escalado × 10⁸; el texto queda sin ceros sobrantes (`7.64489`). */
  static deEscalado(escalado: bigint): TipoDeCambio {
    const completo = escalado.toString().padStart(ESCALA + 1, '0');
    const fraccion = completo.slice(-ESCALA).replace(/0+$/, '');
    const entera = completo.slice(0, -ESCALA);
    return new TipoDeCambio(fraccion ? `${entera}.${fraccion}` : entera, escalado);
  }

  /** El tipo del quetzal consigo mismo: uno. */
  static readonly UNO = TipoDeCambio.deEscalado(FACTOR);

  /** Centavos de la moneda extranjera → centavos de quetzal. */
  aQuetzales(centavosEnMoneda: number): number {
    return aCentavosEnteros(dividirRedondeando(aEntero(centavosEnMoneda) * this.escalado, FACTOR));
  }

  /** Centavos de quetzal → centavos de la moneda extranjera. */
  aMoneda(centavosEnQuetzales: number): number {
    return aCentavosEnteros(dividirRedondeando(aEntero(centavosEnQuetzales) * FACTOR, this.escalado));
  }
}
