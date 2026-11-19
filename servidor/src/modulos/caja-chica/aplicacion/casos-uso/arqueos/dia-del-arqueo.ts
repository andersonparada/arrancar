import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PoliticaDeZonaHoraria } from '../../../../core/compartido/aplicacion/reloj.js';
import { fechaLocalEn } from '../../../../core/compartido/dominio/fecha-local.js';

/**
 * El día contable de un conteo: el que marca el reloj de pared de la zona horaria de la empresa en ese instante
 * (no el de los caracteres escritos ni el de UTC). Lo usan el registro y la anulación, para que digan lo mismo.
 */
export async function diaDelConteo(
  politica: PoliticaDeZonaHoraria,
  por: { operador: Operador; realizadoEn: Date },
): Promise<string> {
  return fechaLocalEn(por.realizadoEn, await politica.zonaHoraria(por.operador));
}
