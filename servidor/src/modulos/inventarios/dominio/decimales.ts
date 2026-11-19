import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/** Un número escrito como texto no es un decimal válido o trae más decimales de los que se guardan. */
export class DecimalInvalido extends DatoInvalido {
  readonly codigo = 'decimal_invalido';
}

/**
 * Pasa un decimal escrito como texto (`"12.5"`, `"-0.0001"`) a un entero con `decimales` cifras: con 4, `"12.5"` es
 * `125000n`. Nunca usa coma flotante. Los decimales que sobran solo se admiten si son ceros.
 * @throws DecimalInvalido si no es un número o tiene más cifras significativas de las que caben.
 */
export function deTextoAEntero(texto: string, decimales: number): bigint {
  const limpio = texto.trim();
  const partes = /^(-?)(\d+)(?:\.(\d*))?$/.exec(limpio);
  if (!partes) throw new DecimalInvalido(`"${texto}" no es un número.`);
  const [, signo, enteros, fraccion = ''] = partes;
  if (/[^0]/.test(fraccion.slice(decimales))) {
    throw new DecimalInvalido(`"${texto}" tiene más de ${decimales} decimales.`);
  }
  const magnitud = BigInt(enteros! + fraccion.slice(0, decimales).padEnd(decimales, '0'));
  return signo ? -magnitud : magnitud;
}

/** Lo contrario de `deTextoAEntero`: `125000n` con 4 decimales es `"12.5000"`. */
export function deEnteroATexto(valor: bigint, decimales: number): string {
  const signo = valor < 0n ? '-' : '';
  const digitos = (valor < 0n ? -valor : valor).toString().padStart(decimales + 1, '0');
  const corte = digitos.length - decimales;
  return `${signo}${digitos.slice(0, corte)}.${digitos.slice(corte)}`;
}

/** Cantidades: `numeric(14,4)`, diezmilésimas enteras. */
export const aDiezmilesimas = (texto: string): bigint => deTextoAEntero(texto, 4);
export const deDiezmilesimas = (valor: bigint): string => deEnteroATexto(valor, 4);

/** Costos unitarios: `numeric(15,6)`, millonésimas enteras. */
export const aMillonesimas = (texto: string): bigint => deTextoAEntero(texto, 6);
export const deMillonesimas = (valor: bigint): string => deEnteroATexto(valor, 6);

/** Dinero: `numeric(14,2)`, centavos enteros. */
export const aCentavosEnteros = (texto: string): bigint => deTextoAEntero(texto, 2);
export const deCentavosEnteros = (valor: bigint): string => deEnteroATexto(valor, 2);
