import type { ConsultasDeUsoDelKardex } from '../aplicacion/puertos/consultas-de-uso-del-kardex.js';

/** El uso del kardex en memoria: la prueba dice qué artículos y bodegas tienen movimientos o existencias. */
export class UsoDelKardexEnMemoria implements ConsultasDeUsoDelKardex {
  readonly articulosConMovimientos = new Set<string>();
  readonly articulosConExistencias = new Set<string>();
  readonly bodegasConExistencias = new Set<string>();
  readonly bodegasConTrasladosEnTransito = new Set<string>();

  async articuloConMovimientos(articuloId: string): Promise<boolean> {
    return this.articulosConMovimientos.has(articuloId);
  }

  async articuloConExistencias(articuloId: string): Promise<boolean> {
    return this.articulosConExistencias.has(articuloId);
  }

  async bodegaConExistencias(bodegaId: string): Promise<boolean> {
    return this.bodegasConExistencias.has(bodegaId);
  }

  async bodegaConTrasladosEnTransito(bodegaId: string): Promise<boolean> {
    return this.bodegasConTrasladosEnTransito.has(bodegaId);
  }
}
