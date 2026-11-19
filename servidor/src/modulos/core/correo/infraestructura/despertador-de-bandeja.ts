import type { Despertador } from '../aplicacion/puertos/despertador.js';

/**
 * Une a quien encola con el trabajador, que se crea después (en `principal.ts`). Sin trabajador (en las pruebas, o con
 * la llave de secretos ausente) despertar no hace nada: el correo queda en la bandeja y se envía cuando arranque.
 */
export class DespertadorDeBandeja implements Despertador {
  private oyente: (() => void) | null = null;

  alDespertar(oyente: () => void): void {
    this.oyente = oyente;
  }

  despertar(): void {
    this.oyente?.();
  }
}
