import { deCentavos } from '../centavos.js';
import {
  CONFIANZA_MINIMA_DE_UNA_ALTERNATIVA,
  MAXIMO_DE_ALTERNATIVAS_CON_SUGERIDO,
  MAXIMO_DE_ALTERNATIVAS_SIN_SUGERIDO,
  PESO_DEL_NO_SE,
} from './constantes.js';
import type { CasoVotante, ConceptoOfrecible, OpcionSugerida, ResultadoDeVotacion } from './tipos.js';

export interface ParametrosDeVotacion {
  /** Confianza (%) desde la que el primero se muestra como sugerido. */
  confianzaMinima: number;
}

interface Puntaje {
  concepto: ConceptoOfrecible;
  puntaje: number;
  casos: CasoVotante[];
  masCercano: CasoVotante;
}

const sumaDePesos = (casos: CasoVotante[]) => casos.reduce((suma, caso) => suma + caso.peso, 0);

function agruparPorConcepto(casos: CasoVotante[]): Map<string, CasoVotante[]> {
  const grupos = new Map<string, CasoVotante[]>();
  for (const caso of casos) grupos.set(caso.conceptoId, [...(grupos.get(caso.conceptoId) ?? []), caso]);
  return grupos;
}

/** Empate: mayor puntaje, luego el caso más cercano en fecha y luego el nombre. */
function puntajesOrdenados(grupos: Map<string, CasoVotante[]>, ofrecibles: ConceptoOfrecible[]): Puntaje[] {
  return ofrecibles
    .filter((concepto) => grupos.has(concepto.id))
    .map((concepto) => {
      const casos = grupos.get(concepto.id)!;
      const masCercano = casos.reduce((a, b) => (b.distanciaEnDias < a.distanciaEnDias ? b : a));
      return { concepto, puntaje: sumaDePesos(casos), casos, masCercano };
    })
    .sort(
      (a, b) =>
        b.puntaje - a.puntaje ||
        a.masCercano.distanciaEnDias - b.masCercano.distanciaEnDias ||
        a.concepto.nombre.localeCompare(b.concepto.nombre, 'es'),
    );
}

function aOpcion({ concepto, casos, masCercano }: Puntaje, confianza: number): OpcionSugerida {
  const montos = casos.map((caso) => caso.montoEnCentavos);
  return {
    conceptoId: concepto.id,
    conceptoNombre: concepto.nombre,
    confianza,
    porque: {
      base: masCercano.base,
      casos: casos.length,
      ultimaFecha: masCercano.fecha,
      montoMinimo: deCentavos(Math.min(...montos)),
      montoMaximo: deCentavos(Math.max(...montos)),
      beneficiarioParecido: null,
    },
  };
}

/**
 * Votación ponderada de vecinos: `confianza(c) = S(c) / (W + α)`, con `S(c)` la suma de pesos de los casos del
 * concepto, `W` la de todos (también los conceptos que no se pueden ofrecer, que restan confianza) y `α` el peso
 * del «no sé». Es una confianza, no una probabilidad calibrada. El primero es «sugerido» si llega a la confianza
 * mínima; las alternativas son los siguientes con al menos 10 %.
 */
export function votar(
  casos: CasoVotante[],
  ofrecibles: ConceptoOfrecible[],
  { confianzaMinima }: ParametrosDeVotacion,
): ResultadoDeVotacion {
  const total = sumaDePesos(casos);
  const opciones = puntajesOrdenados(agruparPorConcepto(casos), ofrecibles)
    .map((puntaje) => aOpcion(puntaje, Math.round((100 * puntaje.puntaje) / (total + PESO_DEL_NO_SE))))
    .filter((opcion) => opcion.confianza >= CONFIANZA_MINIMA_DE_UNA_ALTERNATIVA);
  const [primero, ...resto] = opciones;
  const haySugerido = primero !== undefined && primero.confianza >= confianzaMinima;
  const maximo = haySugerido ? MAXIMO_DE_ALTERNATIVAS_CON_SUGERIDO : MAXIMO_DE_ALTERNATIVAS_SIN_SUGERIDO;
  return {
    sugerido: haySugerido ? primero : null,
    alternativas: (haySugerido ? resto : opciones).slice(0, maximo),
    casosComparados: casos.length,
  };
}
