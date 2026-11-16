import { quetzales } from './avisos.js';
import { numeroDelRetiro, type RetiroDeEfectivo } from './retiros.js';

/** El aviso de fin de mes: un retiro abierto de un mes anterior tiene efectivo a cargo del custodio. */
export function avisoDeRetiroDeMesAnterior(
  retiro: Pick<RetiroDeEfectivo, 'numero' | 'anioDeNumero' | 'fecha' | 'custodio'>,
  disponibleCentavos: number,
): string {
  const [anio, mes] = retiro.fecha.split('-');
  const numero = numeroDelRetiro(retiro.numero, retiro.anioDeNumero);
  return `El retiro ${numero} es de ${mes}/${anio} y aún tiene ${quetzales(disponibleCentavos)} sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de ${retiro.custodio}.`;
}

/** Quien liquida es el custodio: conviene que lo liquide otra persona. */
export const AVISO_DEL_CUSTODIO_QUE_LIQUIDA =
  'Usted es el custodio de este retiro: conviene que lo liquide otra persona.';
