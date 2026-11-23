import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { ETIQUETAS_DE_METODO } from '../compartido/etiquetas';
import type { FilaDeMetodo, MetodoDeCosteo, PoliticaDeCosteo } from '../../servicios/metodo-de-costeo.api';

/** El servidor usa esta fecha para el primer método: significa «desde el principio». */
const DESDE_DEL_PRIMER_METODO = '2000-01-01';

export const textoDeDesde = (desde: string): string =>
  desde === DESDE_DEL_PRIMER_METODO ? 'Desde el inicio' : `Desde el ${formatearFecha(desde)}`;

/** El título y la explicación de la política que rige, o de la propuesta si nadie la eligió. */
export function resumenDeLaPolitica(politica: PoliticaDeCosteo): { titulo: string; explicacion: string } {
  const nombre = ETIQUETAS_DE_METODO[politica.metodo];
  if (!politica.elegido) {
    return {
      titulo: `Propuesta: ${nombre}`,
      explicacion:
        'Todavía no se eligió el método de costeo. Elíjalo antes del primer movimiento: desde que un movimiento lo usa, cambiarlo exige la autorización de la SAT.',
    };
  }
  if (politica.fijado) {
    return {
      titulo: nombre,
      explicacion:
        'Un movimiento ya usó este método, así que ya no se puede cambiar libremente: un cambio necesita la autorización de la SAT y rige desde el 1 de enero del año siguiente a la autorización.',
    };
  }
  return {
    titulo: nombre,
    explicacion:
      'Ningún movimiento lo ha usado todavía: puede cambiarlo las veces que necesite. Desde el primer movimiento queda fijo.',
  };
}

/** ¿Se puede elegir otro método ahora? Lo dice el servidor con `fijado`; aquí no se adivina nada. */
export const sePuedeElegir = (politica: PoliticaDeCosteo): boolean => !politica.fijado;

/** La pregunta antes de guardar un método: qué pasa y por qué importa. */
export function preguntaDeElegir(metodo: MetodoDeCosteo): string {
  return `El costo de todas las salidas se calculará con «${ETIQUETAS_DE_METODO[metodo]}» para toda la empresa. Puede cambiarlo mientras ningún movimiento lo use; después solo con la autorización de la SAT.`;
}

/** Lo que dice una fila de la historia. */
export function detalleDeFila(fila: FilaDeMetodo): string {
  const partes = [textoDeDesde(fila.desde)];
  if (fila.autorizacionSatNumero) {
    const fecha = fila.autorizacionSatFecha ? ` del ${formatearFecha(fila.autorizacionSatFecha)}` : '';
    partes.push(`Autorización SAT n.º ${fila.autorizacionSatNumero}${fecha}`);
  }
  if (fila.motivo) partes.push(fila.motivo);
  return partes.join(' · ');
}
