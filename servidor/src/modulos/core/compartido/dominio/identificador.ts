import { DatoInvalido } from './errores.js';
import { ObjetoValor } from './objeto-valor.js';

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IdentificadorInvalido extends DatoInvalido {
  readonly codigo = 'identificador_invalido';

  constructor(texto: string) {
    super(`"${texto}" no es un identificador válido.`);
  }
}

/**
 * Identidad de una entidad (UUID). La marca evita mezclar identificadores de
 * entidades distintas: un `Identificador<'Tercero'>` no se acepta donde se
 * espera un `Identificador<'Empresa'>`.
 *
 * @example export type TerceroId = Identificador<'Tercero'>;
 */
export class Identificador<Marca extends string = string> extends ObjetoValor<string> {
  declare private readonly marca: Marca;

  private constructor(valor: string) {
    super(valor);
  }

  static nuevo<Marca extends string>(): Identificador<Marca> {
    return new Identificador<Marca>(crypto.randomUUID());
  }

  static desde<Marca extends string>(texto: string): Identificador<Marca> {
    if (!FORMATO_UUID.test(texto)) throw new IdentificadorInvalido(texto);
    return new Identificador<Marca>(texto.toLowerCase());
  }
}
