import type { MarcadorDeDocumentos } from '../aplicacion/puertos/puertos-de-anticipos.js';

/** Libro de compras de mentira: recuerda qué documentos se marcaron procesados o pendientes. */
export class MarcadorDeDocumentosFalso implements MarcadorDeDocumentos {
  marcas: Array<{ documentoId: string; procesado: boolean }> = [];

  async marcarProcesado(_: unknown, documentoId: string, procesado: boolean): Promise<void> {
    this.marcas.push({ documentoId, procesado });
  }
}
