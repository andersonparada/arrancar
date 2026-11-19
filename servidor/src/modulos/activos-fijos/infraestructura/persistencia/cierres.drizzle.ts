import type { Cierres } from '../../aplicacion/puertos/cierres.js';

/**
 * Los cierres mensuales los crea AF-5; mientras no existan, ningún mes está cerrado ni ningún tramo está usado. AF-5
 * reemplaza esta clase por la que lee `activos_fijos.cierres` y `activos_fijos.cuotas`.
 */
export class CierresDrizzle implements Cierres {
  async ultimoMesCerrado(): Promise<string | null> {
    return null;
  }

  async usaronTramosDelActivo(): Promise<boolean> {
    return false;
  }
}
