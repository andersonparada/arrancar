import { DocumentoAnteriorALaFechaDeInicio } from './errores-de-documento.js';
import { primerDiaDelMes } from './fechas-del-libro.js';

export const AVISO_DE_MES_INCOMPLETO =
  'La empresa empezó a usar el sistema a mitad de ese mes: el libro de ese mes queda incompleto.';

/**
 * Lo anterior a la fecha de inicio de la empresa no se registra en el libro: se carga como saldo inicial.
 * Sin fecha de inicio no hay límite.
 * @throws DocumentoAnteriorALaFechaDeInicio
 */
export function exigirPosteriorALaFechaDeInicio(fechaDeEmision: string, fechaDeInicio: string | null): void {
  if (fechaDeInicio !== null && fechaDeEmision < fechaDeInicio)
    throw new DocumentoAnteriorALaFechaDeInicio(fechaDeInicio);
}

/** Si la fecha de inicio no es día 1 y el documento es de ese mes, el libro de ese mes queda incompleto. */
export function avisosDeLaFechaDeInicio(fechaDeEmision: string, fechaDeInicio: string | null): string[] {
  if (fechaDeInicio === null || fechaDeInicio.endsWith('-01')) return [];
  return primerDiaDelMes(fechaDeEmision) === primerDiaDelMes(fechaDeInicio) ? [AVISO_DE_MES_INCOMPLETO] : [];
}
