import type { ControlDePeriodos } from '../aplicacion/puertos/puertos-de-documentos.js';

/** Hasta L5 (períodos declarados) ningún período queda cerrado: no bloquea nada. */
export class ControlDePeriodosSinBloqueo implements ControlDePeriodos {
  async exigirAbierto(_periodo: string): Promise<void> {}
}
