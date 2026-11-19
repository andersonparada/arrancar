import type { TipoDeCambioDto } from '../puertos/tipos-de-cambio-guardados.js';
import type { TiposDeCambio } from '../tipos-de-cambio.js';

interface Dependencias {
  tiposDeCambio: Pick<TiposDeCambio, 'serie'>;
}

/** La versión vigente de cada día con tipo en un rango. */
export class ListarSerieDeTipos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(moneda: string, desde: string, hasta: string): Promise<TipoDeCambioDto[]> {
    return this.dependencias.tiposDeCambio.serie(moneda, desde, hasta);
  }
}
