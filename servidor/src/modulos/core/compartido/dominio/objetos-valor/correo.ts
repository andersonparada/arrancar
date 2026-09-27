import { DatoInvalido } from '../errores.js';
import { ObjetoValor } from '../objeto-valor.js';

const LARGO_MAXIMO = 254;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class CorreoInvalido extends DatoInvalido {
  readonly codigo = 'correo_invalido';

  constructor(texto: string) {
    super(`El correo "${texto}" no es válido.`);
  }
}

/** Correo electrónico, guardado en minúsculas y sin espacios alrededor. */
export class Correo extends ObjetoValor<string> {
  private constructor(valor: string) {
    super(valor);
  }

  static crear(texto: string): Correo {
    const normalizado = texto.trim().toLowerCase();
    if (normalizado.length > LARGO_MAXIMO || !FORMATO_CORREO.test(normalizado)) throw new CorreoInvalido(texto);
    return new Correo(normalizado);
  }
}
