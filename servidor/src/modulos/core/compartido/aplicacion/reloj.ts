import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Qué día es «hoy» para una empresa: el de su zona horaria (`core.regional.zona_horaria`,
 * `America/Guatemala` por omisión), no el de UTC. Todo caso de uso que necesite la fecha de hoy
 * la pide aquí, así las pruebas fijan la hora y ningún módulo cuenta «mañana» por la tarde.
 */
export interface Reloj {
  /** La fecha de hoy (`AAAA-MM-DD`) en la zona horaria de la empresa del contexto. */
  hoy(contexto: ContextoEmpresa): Promise<string>;
}

/** Decide la zona horaria de una empresa. */
export interface PoliticaDeZonaHoraria {
  zonaHoraria(contexto: ContextoEmpresa): Promise<string>;
}
