type ValorPrimitivo = string | number | boolean;

/**
 * Concepto del negocio que se define por su valor y no por una identidad: dos NIT
 * con el mismo número son el mismo NIT. Es inmutable y solo se crea válido, con
 * los métodos de fábrica de cada subclase.
 */
export abstract class ObjetoValor<Valor extends ValorPrimitivo> {
  protected constructor(readonly valor: Valor) {}

  esIgualA(otro: ObjetoValor<Valor>): boolean {
    return otro.constructor === this.constructor && otro.valor === this.valor;
  }

  toString(): string {
    return String(this.valor);
  }

  toJSON(): Valor {
    return this.valor;
  }
}
