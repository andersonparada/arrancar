import type { EventoDominio } from '../dominio/evento-dominio.js';
import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Avisa a los módulos interesados (Contabilidad) que ya quedaron registrados unos eventos. Corre dentro de la misma
 * transacción: si un módulo lo rechaza, se deshace el hecho que los causó.
 */
export interface AvisadorDeEventosRegistrados {
  eventosRegistrados(contexto: ContextoEmpresa, eventos: readonly EventoDominio[]): Promise<void>;
}
