import { domainToASCII } from 'node:url';
import { ObjetoValor } from '../../compartido/dominio/objeto-valor.js';
import { DireccionNoUtilizable } from './errores-de-correo.js';
import { tieneControlesOBidireccionales } from './saneado.js';

const LARGO_MAXIMO = 254;
const LARGO_MAXIMO_LOCAL = 64;
const ATEXTO = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+";
const PARTE_LOCAL = new RegExp(`^${ATEXTO}(\\.${ATEXTO})*$`);
const ETIQUETA = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Dirección a la que sí se puede mandar un correo. Es más estricta que `Correo` (C6 de la revisión de
 * seguridad): solo ASCII imprimible, parte local de caracteres «atext» y puntos, sin comillas, comentarios,
 * `<>,;()`, espacios, CR/LF, NUL ni controles bidireccionales. El dominio se pasa a punycode y a minúsculas.
 * Las direcciones guardadas que no la cumplan no se cambian: solo no se usan para enviar.
 */
export class DireccionDeEnvio extends ObjetoValor<string> {
  private constructor(valor: string) {
    super(valor);
  }

  /** Crea la dirección o lanza `DireccionNoUtilizable`. */
  static crear(texto: string): DireccionDeEnvio {
    const normalizada = normalizar(texto);
    if (normalizada === null) throw new DireccionNoUtilizable();
    return new DireccionDeEnvio(normalizada);
  }

  /** Indica si el texto sirve para enviar, sin lanzar. */
  static esUtilizable(texto: string): boolean {
    return normalizar(texto) !== null;
  }

  get parteLocal(): string {
    return this.valor.slice(0, this.valor.lastIndexOf('@'));
  }

  get dominio(): string {
    return this.valor.slice(this.valor.lastIndexOf('@') + 1);
  }
}

function normalizar(texto: string): string | null {
  if (texto.length > LARGO_MAXIMO || /\s/.test(texto) || tieneControlesOBidireccionales(texto)) return null;
  const partes = texto.split('@');
  if (partes.length !== 2) return null;
  const [local, dominio] = partes as [string, string];
  const dominioAscii = parteLocalValida(local) ? dominioNormalizado(dominio) : null;
  if (dominioAscii === null) return null;
  const direccion = `${local}@${dominioAscii}`;
  return direccion.length <= LARGO_MAXIMO ? direccion : null;
}

function parteLocalValida(local: string): boolean {
  return local.length <= LARGO_MAXIMO_LOCAL && PARTE_LOCAL.test(local);
}

function dominioNormalizado(dominio: string): string | null {
  const ascii = domainToASCII(dominio);
  const etiquetas = ascii.split('.');
  if (etiquetas.length < 2 || !etiquetas.every((etiqueta) => ETIQUETA.test(etiqueta))) return null;
  return TLD.test(etiquetas[etiquetas.length - 1] as string) ? ascii : null;
}
