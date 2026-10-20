import { AVISO_DE_ANULACION_DE_DTE, avisoDeBandeja } from '../../../dominio/periodos/avisos-de-periodos.js';
import type { AvisoDeRevisionDto } from '../../dto/periodo.dto.js';
import type { ConsultasDelPeriodo } from '../../puertos/puertos-de-periodos.js';

/**
 * Lo que conviene mirar antes de declarar (nunca bloquea): los DTE pendientes en la bandeja que pueden ir en el
 * período, solo si la empresa subió lotes de la bandeja que lo toquen, y que los emisores pueden anular DTE hasta
 * el vencimiento. Corre dentro de la unidad de trabajo en curso.
 */
export async function revisionDelPeriodo(
  consultas: Pick<ConsultasDelPeriodo, 'dtePendientesQuePuedenIrEn'>,
  periodo: string,
): Promise<AvisoDeRevisionDto[]> {
  const revision: AvisoDeRevisionDto[] = [];
  const pendientes = await consultas.dtePendientesQuePuedenIrEn(periodo);
  if (pendientes) {
    revision.push({ codigo: 'bandeja_pendiente', mensaje: avisoDeBandeja(pendientes), cantidad: pendientes });
  }
  revision.push({ codigo: 'anulacion_de_dte', mensaje: AVISO_DE_ANULACION_DE_DTE });
  return revision;
}
