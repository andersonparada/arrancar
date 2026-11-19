import { ConversionInvalida } from './errores.js';
import { tieneFactorALaReferencia, type Magnitud } from './magnitudes.js';

/** Cuántas unidades base trae una unidad de empaque de un artículo («caja de 24»). */
export interface ConversionDeArticulo {
  unidadId: string;
  /** Unidades base en una de esta unidad; mayor que cero. */
  factor: string;
  /** La que propone la recepción de compras; solo una por artículo. */
  paraCompras: boolean;
}

/**
 * Las conversiones de un artículo: sin repetir unidad, sin convertir la unidad base en sí misma, con factor
 * mayor que cero y con una sola «para compras».
 * @throws ConversionInvalida si algo de lo anterior no se cumple.
 */
export function validarConversiones(unidadBaseId: string, conversiones: readonly ConversionDeArticulo[]): void {
  const vistas = new Set<string>();
  for (const { unidadId, factor } of conversiones) {
    if (unidadId === unidadBaseId) throw new ConversionInvalida('La unidad base no se convierte en sí misma.');
    if (vistas.has(unidadId)) throw new ConversionInvalida('Una unidad no puede estar dos veces en las conversiones.');
    if (!(Number(factor) > 0)) throw new ConversionInvalida('El factor de cada conversión debe ser mayor que cero.');
    vistas.add(unidadId);
  }
  if (conversiones.filter((conversion) => conversion.paraCompras).length > 1)
    throw new ConversionInvalida('Solo una conversión puede ser la de compras.');
}

/**
 * Una unidad de la misma magnitud que la base (quintal para un artículo en libras) ya se convierte sola por su
 * factor a la referencia: una conversión propia podría contradecirlo. Las de empaque o cantidad sí se declaran.
 * @throws ConversionInvalida si alguna conversión es de la magnitud de la base y esa magnitud tiene factor.
 */
export function validarMagnitudes(
  unidadBaseId: string,
  conversiones: readonly ConversionDeArticulo[],
  magnitudes: ReadonlyMap<string, Magnitud>,
): void {
  const magnitudBase = magnitudes.get(unidadBaseId);
  if (!magnitudBase || !tieneFactorALaReferencia(magnitudBase)) return;
  if (conversiones.some(({ unidadId }) => magnitudes.get(unidadId) === magnitudBase))
    throw new ConversionInvalida(
      'Esa unidad es de la misma magnitud que la base y se convierte sola: no necesita una conversión propia.',
    );
}
