import { MAXIMO_DE_CASOS_POR_CLAVE, PARAMETROS_DE_MONTO } from './constantes.js';
import { diasEntre, pesoDeMonto, pesoDeRecencia, similitudDeTextos, ventanaEnDias } from './pesos.js';
import type { BaseDeLaSugerencia, CasoVotante, Ejemplo, Pendiente } from './tipos.js';

interface Coincidencia {
  similitud: number;
  base: BaseDeLaSugerencia;
}

/**
 * Con beneficiario: solo cuenta el mismo beneficiario normalizado (similitud 1). Sin beneficiario: los que
 * tampoco lo tienen y son de la misma cuenta bancaria, con similitud 0.5 + 0.5 · Jaccard de referencia y observaciones.
 */
function coincidenciaCon(pendiente: Pendiente, ejemplo: Ejemplo): Coincidencia | null {
  if (pendiente.beneficiarioParaComparar !== null) {
    if (ejemplo.beneficiarioParaComparar !== pendiente.beneficiarioParaComparar) return null;
    return { similitud: 1, base: 'mismo_beneficiario' };
  }
  if (ejemplo.beneficiarioParaComparar !== null || ejemplo.cuentaBancariaId !== pendiente.cuentaBancariaId) return null;
  const jaccard = similitudDeTextos(pendiente.textoParaComparar, ejemplo.textoParaComparar);
  return { similitud: 0.5 + 0.5 * jaccard, base: 'misma_cuenta_sin_beneficiario' };
}

function aCaso(pendiente: Pendiente, ejemplo: Ejemplo, vidaMediaDias: number): CasoVotante | null {
  const coincidencia = coincidenciaCon(pendiente, ejemplo);
  if (!coincidencia) return null;
  const distanciaEnDias = diasEntre(pendiente.fecha, ejemplo.fecha);
  if (distanciaEnDias > ventanaEnDias(vidaMediaDias)) return null;
  const recencia = pesoDeRecencia(distanciaEnDias, vidaMediaDias);
  const monto = pesoDeMonto(pendiente.montoEnCentavos, ejemplo.montoEnCentavos, PARAMETROS_DE_MONTO);
  return {
    conceptoId: ejemplo.conceptoId,
    fecha: ejemplo.fecha,
    montoEnCentavos: ejemplo.montoEnCentavos,
    peso: recencia * coincidencia.similitud * monto,
    distanciaEnDias,
    base: coincidencia.base,
  };
}

/**
 * Los ejemplos que votan por el pendiente (misma dirección, distintos de él, dentro de la ventana de fechas),
 * los 300 más cercanos en fecha, cada uno con su peso: recencia · similitud · cercanía de monto.
 */
export function armarCasos(pendiente: Pendiente, ejemplos: Ejemplo[], vidaMediaDias: number): CasoVotante[] {
  return ejemplos
    .filter((ejemplo) => ejemplo.id !== pendiente.id && ejemplo.direccion === pendiente.direccion)
    .map((ejemplo) => aCaso(pendiente, ejemplo, vidaMediaDias))
    .filter((caso): caso is CasoVotante => caso !== null)
    .sort((a, b) => a.distanciaEnDias - b.distanciaEnDias)
    .slice(0, MAXIMO_DE_CASOS_POR_CLAVE);
}
