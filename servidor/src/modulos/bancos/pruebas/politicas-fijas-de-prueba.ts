import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../aplicacion/puertos/politica-de-misma-fecha-en-anulacion.js';
import type { PoliticaDeSobregiro } from '../aplicacion/puertos/politica-de-sobregiro.js';

/** La variable de sobregiro fija para la prueba. */
export class PoliticaDeSobregiroFija implements PoliticaDeSobregiro {
  constructor(private readonly permite: boolean) {}

  async permiteSobregiro(_operador: Operador): Promise<boolean> {
    return this.permite;
  }
}

/** La variable `bancos.anulaciones.misma_fecha` fija para la prueba; `false` por omisión. */
export class PoliticaDeMismaFechaFija implements PoliticaDeMismaFechaEnAnulacion {
  constructor(private readonly aplicaSiempre: boolean = false) {}

  async aplica(_operador: Operador): Promise<boolean> {
    return this.aplicaSiempre;
  }
}
