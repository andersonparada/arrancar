import { DatoInvalido } from '../../../core/compartido/dominio/errores.js';

/** Lo más que abarca un análisis: dos años de períodos. */
export const MAXIMO_DE_MESES_DEL_ANALISIS = 24;

/** El rango pedido a un análisis no es válido. */
export class RangoDePeriodosInvalido extends DatoInvalido {
  readonly codigo = 'rango_de_periodos_invalido';
}

/** Los períodos de un análisis, desde el primer día del primer mes hasta el primer día del último (ambos incluidos). */
export interface RangoDePeriodos {
  desde: string;
  hasta: string;
}

const MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

function mesesDesdeElAnio0(periodo: string, campo: string): number {
  const partes = MES.exec(periodo.slice(0, 7));
  if (!partes) throw new RangoDePeriodosInvalido(`Escriba "${campo}" como AAAA-MM.`);
  return Number(partes[1]) * 12 + Number(partes[2]) - 1;
}

/**
 * Arma el rango desde `AAAA-MM` (o `AAAA-MM-DD`) y revisa que no esté al revés ni pase de 24 meses.
 * @throws RangoDePeriodosInvalido
 */
export function rangoDePeriodos(desde: string, hasta: string): RangoDePeriodos {
  const primero = mesesDesdeElAnio0(desde, 'desde');
  const ultimo = mesesDesdeElAnio0(hasta, 'hasta');
  if (ultimo < primero) throw new RangoDePeriodosInvalido('El período "hasta" no puede ser anterior a "desde".');
  if (ultimo - primero + 1 > MAXIMO_DE_MESES_DEL_ANALISIS) {
    throw new RangoDePeriodosInvalido(`El análisis abarca hasta ${MAXIMO_DE_MESES_DEL_ANALISIS} meses.`);
  }
  return { desde: `${desde.slice(0, 7)}-01`, hasta: `${hasta.slice(0, 7)}-01` };
}
