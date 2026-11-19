import { LoteInvalido } from './errores.js';

/** Lo que se escribe de un lote. */
export interface DatosDeLote {
  codigo: string;
  fechaDeVencimiento: string | null;
  fechaDeFabricacion: string | null;
  observaciones: string | null;
}

/** Lo que el lote necesita saber del artículo al que pertenece. */
export interface ReglasDeLotesDelArticulo {
  manejaLotes: boolean;
  manejaVencimiento: boolean;
}

function codigoDelLote(codigo: string): string {
  const limpio = codigo.trim();
  if (!limpio) throw new LoteInvalido('Escriba el código del lote.');
  if (limpio.length > 40) throw new LoteInvalido('El código del lote no puede pasar de 40 caracteres.');
  return limpio;
}

function observacionesDelLote(observaciones: string | null): string | null {
  const limpias = observaciones?.trim() || null;
  if (limpias && limpias.length > 500) throw new LoteInvalido('Las observaciones no pueden pasar de 500 caracteres.');
  return limpias;
}

/** El vencimiento es obligatorio si el artículo lo maneja, y la fabricación no es posterior a él. */
function fechasValidas(articulo: ReglasDeLotesDelArticulo, datos: DatosDeLote): void {
  if (articulo.manejaVencimiento && !datos.fechaDeVencimiento)
    throw new LoteInvalido('Escriba la fecha de vencimiento: el artículo la maneja.');
  const { fechaDeFabricacion, fechaDeVencimiento } = datos;
  if (fechaDeFabricacion && fechaDeVencimiento && fechaDeFabricacion > fechaDeVencimiento)
    throw new LoteInvalido('La fecha de fabricación no puede ser posterior al vencimiento.');
}

/**
 * Revisa y limpia los datos de un lote nuevo.
 * @throws LoteInvalido si el artículo no maneja lotes, falta el vencimiento que exige o las fechas se contradicen.
 */
export function lotePermitido(articulo: ReglasDeLotesDelArticulo, datos: DatosDeLote): DatosDeLote {
  if (!articulo.manejaLotes) throw new LoteInvalido('El artículo no maneja lotes.');
  fechasValidas(articulo, datos);
  return { ...datos, codigo: codigoDelLote(datos.codigo), observaciones: observacionesDelLote(datos.observaciones) };
}
