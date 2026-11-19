import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';

/** Una fila de la historia del método de la empresa (§5.7). */
export interface MetodoGuardado {
  id: string;
  metodo: MetodoDeCosteo;
  /** Primer día de mes desde el que rige. */
  desde: string;
  fijadoEn: Date | null;
  autorizacionSatNumero: string | null;
  autorizacionSatFecha: string | null;
  motivo: string | null;
}

/** Guarda la historia del método de costeo de la empresa (RLS por empresa). */
export interface RepositorioDeMetodos {
  /** De la más reciente a la más antigua. */
  listar(): Promise<MetodoGuardado[]>;
  agregar(metodo: MetodoGuardado): Promise<void>;
  /** Marca que un movimiento ya lo usó: desde ahí no se edita ni se elimina. */
  fijar(id: string, ahora: Date): Promise<void>;
  /** Cambia el método de una fila que todavía no se fijó. Devuelve `false` si ya estaba fijada (no se tocó). */
  cambiar(id: string, metodo: MetodoDeCosteo): Promise<boolean>;
  /**
   * Toma el candado de la política de costeo de la empresa hasta el fin de la transacción: quien elige el método y
   * quien registra el primer movimiento se turnan, así lo que uno lee sin fijar no lo cambia el otro a medias.
   */
  bloquearPolitica(): Promise<void>;
}
