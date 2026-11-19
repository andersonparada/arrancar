import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import type { ConversionDeArticulo } from './conversion.js';
import { dividirRedondeado } from './costeo/escalas.js';
import { deTextoAEntero } from './decimales.js';
import type { Magnitud } from './magnitudes.js';

/** La unidad en que se escribió una cantidad no se puede pasar a la unidad base del artículo. */
export class UnidadSinConversion extends DatoInvalido {
  readonly codigo = 'unidad_sin_conversion';

  constructor() {
    super('La unidad elegida no se convierte a la unidad base del artículo: agregue su conversión en la ficha.');
  }
}

/** Lo que la conversión necesita saber de una unidad. */
export interface UnidadParaConvertir {
  id: string;
  magnitud: Magnitud;
  factorALaReferencia: string | null;
}

export interface DatosDeConversion {
  /** Diezmilésimas, en la unidad en que se escribió. */
  cantidad: bigint;
  unidad: UnidadParaConvertir;
  base: UnidadParaConvertir;
  conversiones: readonly ConversionDeArticulo[];
}

const ESCALA_DEL_FACTOR = 8;
const UNO = 10n ** BigInt(ESCALA_DEL_FACTOR);

const factorDe = (texto: string): bigint => deTextoAEntero(texto, ESCALA_DEL_FACTOR);

/** Misma magnitud con factor a la referencia en las dos: se pasa por los factores, sin configurar nada. */
function porMagnitud({ cantidad, unidad, base }: DatosDeConversion): bigint | null {
  if (unidad.magnitud !== base.magnitud) return null;
  if (unidad.factorALaReferencia === null || base.factorALaReferencia === null) return null;
  return dividirRedondeado(cantidad * factorDe(unidad.factorALaReferencia), factorDe(base.factorALaReferencia));
}

function porConversionDelArticulo({ cantidad, unidad, conversiones }: DatosDeConversion): bigint | null {
  const conversion = conversiones.find((c) => c.unidadId === unidad.id);
  return conversion ? dividirRedondeado(cantidad * factorDe(conversion.factor), UNO) : null;
}

/**
 * Pasa una cantidad escrita en cualquier unidad a la unidad base del artículo (diezmilésimas), redondeando al
 * más cercano: la de la misma base tal cual, la de su misma magnitud por el factor a la referencia y las de empaque
 * (caja, saco) por la conversión del artículo.
 * @throws UnidadSinConversion si no hay forma de pasarla.
 */
export function convertirABase(datos: DatosDeConversion): bigint {
  if (datos.unidad.id === datos.base.id) return datos.cantidad;
  const convertida = porMagnitud(datos) ?? porConversionDelArticulo(datos);
  if (convertida === null) throw new UnidadSinConversion();
  return convertida;
}
