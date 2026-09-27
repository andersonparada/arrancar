import { DatoInvalido } from '../errores.js';
import { ObjetoValor } from '../objeto-valor.js';

const CONSUMIDOR_FINAL = 'CF';
const FORMATO_NIT = /^\d{1,12}[\dK]$/;

export class NitInvalido extends DatoInvalido {
  readonly codigo = 'nit_invalido';

  constructor(texto: string) {
    super(`El NIT "${texto}" no es válido (revise el dígito verificador).`);
  }
}

/** Quita espacios y guiones y pasa a mayúsculas: "1234567-k" → "1234567K". */
export function normalizarNit(texto: string): string {
  return texto.replace(/[\s-]/g, '').toUpperCase();
}

/** Módulo 11 con pesos que bajan de (largo + 1) a 2; un resultado de 10 se escribe "K". */
function digitoVerificadorEsperado(cuerpo: string): string {
  const suma = [...cuerpo].reduce(
    (total, digito, posicion) => total + Number(digito) * (cuerpo.length + 1 - posicion),
    0,
  );
  const resultado = (11 - (suma % 11)) % 11;
  return resultado === 10 ? 'K' : String(resultado);
}

/** Valida un NIT de Guatemala ya normalizado. "CF" (consumidor final) es válido. */
export function esNitValido(nit: string): boolean {
  if (nit === CONSUMIDOR_FINAL) return true;
  if (!FORMATO_NIT.test(nit)) return false;
  return nit.slice(-1) === digitoVerificadorEsperado(nit.slice(0, -1));
}

/** Número de Identificación Tributaria de Guatemala, o "CF" para el consumidor final. */
export class Nit extends ObjetoValor<string> {
  static readonly CONSUMIDOR_FINAL = new Nit(CONSUMIDOR_FINAL);

  private constructor(valor: string) {
    super(valor);
  }

  static crear(texto: string): Nit {
    const normalizado = normalizarNit(texto);
    if (normalizado === CONSUMIDOR_FINAL) return Nit.CONSUMIDOR_FINAL;
    if (!esNitValido(normalizado)) throw new NitInvalido(texto);
    return new Nit(normalizado);
  }

  esConsumidorFinal(): boolean {
    return this.valor === CONSUMIDOR_FINAL;
  }
}
