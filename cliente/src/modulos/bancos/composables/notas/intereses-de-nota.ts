import { aCentavos, deCentavos } from '../comunes/centavos';

/** La tasa de ISR sobre intereses (Decreto 10-2012) que se propone si la instalación no dice otra. */
export const TASA_DE_ISR_POR_OMISION = 0.1;

/** Un texto de monto como centavos, o `null` si está vacío o no es un importe válido (mientras se escribe). */
function centavosOnulo(texto: string | number): number | null {
  try {
    return String(texto).trim() === '' ? null : aCentavos(String(texto));
  } catch {
    return null;
  }
}

/**
 * El ISR que se propone: la tasa sobre el interés bruto, redondeado al centavo hacia arriba desde la mitad y con
 * aritmética entera (la tasa se pasa a diezmilésimas). Vacío si el bruto no sirve. El usuario puede cambiarlo:
 * el banco redondea a su manera.
 */
export function isrPropuesto(bruto: string | number, tasa: number): string {
  const centavos = centavosOnulo(bruto);
  if (centavos === null || centavos <= 0) return '';
  const diezmilesimas = Math.round(tasa * 10_000);
  return deCentavos(Math.floor((centavos * diezmilesimas + 5_000) / 10_000));
}

/** El neto que acredita el banco (bruto - ISR): el monto de la nota. Vacío si falta un dato o el ISR pasa del bruto. */
export function netoDeIntereses(bruto: string | number, isr: string | number): string {
  const centavosDelBruto = centavosOnulo(bruto);
  const centavosDelIsr = centavosOnulo(isr);
  if (centavosDelBruto === null || centavosDelIsr === null) return '';
  const neto = centavosDelBruto - centavosDelIsr;
  return centavosDelIsr < 0 || neto <= 0 ? '' : deCentavos(neto);
}
