import type { TipoDeMovimiento } from '../asignacion-de-concepto.js';

/** Solo votan ejemplos de la misma dirección: entra dinero (crédito) o sale (débito y cheque). */
export type Direccion = 'entrada' | 'salida';

export const direccionDe = (tipo: TipoDeMovimiento): Direccion => (tipo === 'credito' ? 'entrada' : 'salida');

/** En qué se parece un caso al movimiento que se quiere clasificar. */
export type BaseDeLaSugerencia = 'mismo_beneficiario' | 'beneficiario_parecido' | 'misma_cuenta_sin_beneficiario';

/** Lo que se compara de un movimiento, sea el pendiente o un ejemplo. Los textos ya vienen normalizados por la base. */
export interface DatosParaComparar {
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoEnCentavos: number;
  direccion: Direccion;
  cuentaBancariaId: string;
  /** `bancos.nombre_para_comparar(beneficiario)`; nulo si no tiene. */
  beneficiarioParaComparar: string | null;
  /** `bancos.nombre_para_comparar(referencia || ' ' || observaciones)`; nulo si no hay texto. */
  textoParaComparar: string | null;
}

/** Un movimiento ya clasificado por una persona: enseña a los demás. */
export interface Ejemplo extends DatosParaComparar {
  id: string;
  conceptoId: string;
}

/**
 * Un movimiento por clasificar. Si aún no existe (se está capturando), `id` es nulo y el monto puede faltar:
 * entonces el monto no distingue a ningún ejemplo.
 */
export interface Pendiente extends Omit<DatosParaComparar, 'montoEnCentavos'> {
  id: string | null;
  montoEnCentavos: number | null;
}

/** Un ejemplo que vota por su concepto, ya con su peso. */
export interface CasoVotante {
  conceptoId: string;
  fecha: string;
  montoEnCentavos: number;
  peso: number;
  distanciaEnDias: number;
  base: BaseDeLaSugerencia;
}

export interface ConceptoOfrecible {
  id: string;
  nombre: string;
}

/** Por qué se sugiere un concepto (la frase la arma el cliente). */
export interface PorQueSeSugiere {
  base: BaseDeLaSugerencia;
  casos: number;
  ultimaFecha: string;
  montoMinimo: string;
  montoMaximo: string;
  beneficiarioParecido: string | null;
}

export interface OpcionSugerida {
  conceptoId: string;
  conceptoNombre: string;
  /** Entero de 0 a 100. */
  confianza: number;
  porque: PorQueSeSugiere;
}

export interface ResultadoDeVotacion {
  sugerido: OpcionSugerida | null;
  alternativas: OpcionSugerida[];
  /** Cuántos casos votaron, por cualquier concepto (también los que no se pueden ofrecer). */
  casosComparados: number;
}

/** Cercanía de monto: piso β (lo mínimo que pesa un monto muy distinto) y dispersión σ del logaritmo. */
export interface ParametrosDeMonto {
  piso: number;
  sigma: number;
}
