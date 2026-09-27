import { DatoInvalido } from '../errores.js';
import { ObjetoValor } from '../objeto-valor.js';

/** Un número local de Guatemala tiene 8 dígitos; los internacionales, entre 7 y 15 según la norma E.164. */
const DIGITOS_LOCALES = 8;
const FORMATO_TELEFONO = /^\+?\d{7,15}$/;
const SEPARADORES = /[\s\-().]/g;

export class TelefonoInvalido extends DatoInvalido {
  readonly codigo = 'telefono_invalido';

  constructor(texto: string) {
    super(`El teléfono "${texto}" no es válido.`);
  }
}

/** Número de teléfono guardado sin separadores: "5555-1234" → "55551234", "+502 5555 1234" → "+50255551234". */
export class Telefono extends ObjetoValor<string> {
  private constructor(valor: string) {
    super(valor);
  }

  static crear(texto: string): Telefono {
    const normalizado = texto.replace(SEPARADORES, '');
    if (!FORMATO_TELEFONO.test(normalizado)) throw new TelefonoInvalido(texto);
    return new Telefono(normalizado);
  }

  esLocal(): boolean {
    return this.valor.length === DIGITOS_LOCALES && !this.valor.startsWith('+');
  }

  /** Forma de leerlo en pantalla: los números locales se separan en dos grupos de cuatro ("5555-1234"). */
  paraMostrar(): string {
    return this.esLocal() ? `${this.valor.slice(0, 4)}-${this.valor.slice(4)}` : this.valor;
  }
}
