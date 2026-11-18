import type { ResultadoDeConfirmacion } from '../../servicios/dte-recibidos.api';
import { enGrupos } from './datos-de-la-bandeja';

/** Documentos por tanda: el tope que acepta el servidor en cada confirmación. */
export const DOCUMENTOS_POR_TANDA = 100;

/** Dónde va el envío: la tanda que se está enviando y cuántos documentos ya respondió el servidor. */
export interface AvanceDeTandas {
  tanda: number;
  tandas: number;
  respondidos: number;
  total: number;
}

/** Por qué se detuvo el envío: la tanda que falló y los documentos que no se llegaron a confirmar. */
export interface CorteDeTandas {
  tanda: number;
  tandas: number;
  mensaje: string;
  /** Los de la tanda que falló y los de las siguientes. */
  sinConfirmar: string[];
  /** Los de la tanda que falló (el servidor pudo registrar algunos antes de fallar). */
  deLaTandaQueFallo: string[];
}

export interface ResultadoPorTandas {
  resultados: ResultadoDeConfirmacion[];
  corte: CorteDeTandas | null;
}

/**
 * Envía los ids en tandas de 100, una tras otra. Una respuesta con error en alguna fila no detiene el envío (esa fila
 * queda pendiente); si la solicitud de una tanda falla, se detiene y dice qué quedó sin confirmar.
 */
export async function confirmarPorTandas(
  ids: readonly string[],
  enviarTanda: (ids: string[]) => Promise<ResultadoDeConfirmacion[]>,
  alAvanzar: (avance: AvanceDeTandas) => void,
): Promise<ResultadoPorTandas> {
  const tandas = enGrupos(ids, DOCUMENTOS_POR_TANDA);
  const resultados: ResultadoDeConfirmacion[] = [];
  for (const [indice, tanda] of tandas.entries()) {
    alAvanzar({ tanda: indice + 1, tandas: tandas.length, respondidos: resultados.length, total: ids.length });
    try {
      resultados.push(...(await enviarTanda(tanda)));
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      const sinConfirmar = tandas.slice(indice).flat();
      return {
        resultados,
        corte: { tanda: indice + 1, tandas: tandas.length, mensaje, sinConfirmar, deLaTandaQueFallo: tanda },
      };
    }
  }
  return { resultados, corte: null };
}

const plural = (cantidad: number, singular: string, pluralDe: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

/** «Registrando la tanda 2 de 5: 100 de 480 documentos». */
export const textoDelAvance = ({ tanda, tandas, respondidos, total }: AvanceDeTandas): string =>
  `Registrando la tanda ${tanda} de ${tandas}: ${respondidos} de ${total} documentos.`;

/** Cuántas tandas se enviarán, para avisarlo en el botón; `null` si cabe en una. */
export const textoDeLasTandas = (documentos: number): string | null => {
  const tandas = Math.ceil(documentos / DOCUMENTOS_POR_TANDA);
  return tandas > 1 ? `Se envían en ${tandas} tandas de hasta ${DOCUMENTOS_POR_TANDA}.` : null;
};

/** Lo que el usuario debe saber cuando el envío se detuvo, sin adivinar lo que el servidor no pudo contestar. */
export function textoDelCorte(corte: CorteDeTandas, registrados: number): string[] {
  const { tanda, tandas, mensaje, sinConfirmar, deLaTandaQueFallo } = corte;
  const completas = tanda - 1;
  return [
    `El envío se detuvo en la tanda ${tanda} de ${tandas}: ${mensaje}`,
    `Quedaron registrados ${plural(registrados, 'documento', 'documentos')} (${plural(completas, 'tanda completa', 'tandas completas')}).`,
    `No se confirmaron ${plural(sinConfirmar.length, 'documento', 'documentos')}: los de la tanda ${tanda} (${deLaTandaQueFallo.length}), que pudo registrarse en parte (revise la lista), y los de las tandas siguientes. Siguen pendientes y marcados: vuelva a confirmar.`,
  ];
}
