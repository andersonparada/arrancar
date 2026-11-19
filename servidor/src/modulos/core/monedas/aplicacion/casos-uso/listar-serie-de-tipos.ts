import type { TipoDeCambioDto } from '../puertos/tipos-de-cambio-guardados.js';
import type { TiposDeCambio } from '../tipos-de-cambio.js';

interface Dependencias {
  tiposDeCambio: Pick<TiposDeCambio, 'serie'>;
}

/** Un tipo de la serie para cualquier usuario: sin el motivo ni quién lo registró (eso es solo de soporte). */
export type TipoDeLaSerie = Omit<TipoDeCambioDto, 'motivo' | 'registradoPor'>;

/** La versión vigente de cada día con tipo en un rango. */
export class ListarSerieDeTipos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(moneda: string, desde: string, hasta: string): Promise<TipoDeLaSerie[]> {
    const filas = await this.dependencias.tiposDeCambio.serie(moneda, desde, hasta);
    return filas.map(({ motivo: _motivo, registradoPor: _registradoPor, ...publico }) => publico);
  }
}
