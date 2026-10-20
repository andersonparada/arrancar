import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { EmisionDelLibro } from '../../servicios/libro.api';

export const MAXIMO_DEL_MOTIVO = 300;

/** El folio con que empezaría la próxima emisión. */
export const proximoFolio = (ultimoFolio: number): number => ultimoFolio + 1;

/** «Folio 12» o «Folios 12 al 15 (4 hojas)». */
export function rangoDeFolios({ folioDesde, folioHasta }: Pick<EmisionDelLibro, 'folioDesde' | 'folioHasta'>): string {
  if (folioDesde === folioHasta) return `Folio ${folioDesde}`;
  return `Folios ${folioDesde} al ${folioHasta} (${folioHasta - folioDesde + 1} hojas)`;
}

/** Un período ya emitido exige motivo para emitirlo otra vez. */
export const exigeMotivo = (emisiones: EmisionDelLibro[]): boolean => emisiones.length > 0;

/** Del texto escrito al motivo que se envía: sin espacios sobrantes y `null` si quedó vacío. */
export const motivoLimpio = (texto: string | null | undefined): string | null => texto?.trim() || null;

/** Dice qué falta en el motivo, o `null` si está bien. */
export function problemaDelMotivo(texto: string | null | undefined, obligatorio: boolean): string | null {
  const motivo = motivoLimpio(texto);
  if (!motivo) return obligatorio ? 'Escriba el motivo.' : null;
  return motivo.length > MAXIMO_DEL_MOTIVO ? `El motivo admite hasta ${MAXIMO_DEL_MOTIVO} caracteres.` : null;
}

/** Valida el número de folio escrito; devuelve el entero o el problema. */
export function leerFolio(texto: string | number | null | undefined): { folio: number } | { problema: string } {
  const valor = String(texto ?? '').trim();
  if (!/^\d{1,8}$/.test(valor)) return { problema: 'Escriba un número entero de 0 en adelante, sin puntos ni comas.' };
  return { folio: Number(valor) };
}

/** Revisa el formulario de corrección del folio: el folio y el motivo listos, o los errores por campo. */
export function revisarCorreccion(
  folioEscrito: string | number | null | undefined,
  motivoEscrito: string | null | undefined,
): { folio: number; motivo: string } | { errores: Record<string, string> } {
  const lectura = leerFolio(folioEscrito);
  const problemaDelMotivoEscrito = problemaDelMotivo(motivoEscrito, true);
  if ('folio' in lectura && !problemaDelMotivoEscrito)
    return { folio: lectura.folio, motivo: motivoLimpio(motivoEscrito)! };
  return {
    errores: {
      ...('problema' in lectura ? { ultimoFolio: lectura.problema } : {}),
      ...(problemaDelMotivoEscrito ? { motivo: problemaDelMotivoEscrito } : {}),
    },
  };
}

const SIN_CAMBIOS =
  'El libro no ha cambiado desde su última emisión, así que no se gastaron folios. Descargue la copia en «Emisiones del período».';
const DEMASIADAS_FILAS =
  'El libro tiene demasiadas filas para imprimirlo con folios de una vez. Use el Excel para este período o pida ayuda a soporte.';
const FOLIO_MENOR = 'Escriba un número igual o mayor al último folio de las emisiones de Arrancar, o déjelo como está.';

/** Agrega a los errores conocidos de emitir y de corregir el folio cómo resolverlos. */
export function errorConAyuda(error: unknown): unknown {
  if (!(error instanceof ErrorApi)) return error;
  const mensajes: Record<string, string> = {
    emision_sin_cambios: SIN_CAMBIOS,
    libro_con_demasiadas_filas: DEMASIADAS_FILAS,
    folio_menor_que_lo_emitido: `${error.message} ${FOLIO_MENOR}`,
  };
  const mensaje = mensajes[error.codigo];
  if (!mensaje) return error;
  return new ErrorApi(error.estado, { codigo: error.codigo, mensaje, detalles: error.detalles });
}

/** Espera la petición y, si falla, le pone a los errores conocidos cómo resolverlos. */
export const conAyuda = <T>(peticion: Promise<T>): Promise<T> =>
  peticion.catch((error: unknown) => {
    throw errorConAyuda(error);
  });
