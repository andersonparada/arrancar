import type { EntradaDeBitacoraDto } from '../dto/entrada-de-bitacora.dto.js';
import type { Bitacora } from '../puertos/bitacora.js';

const ENTRADAS_A_MOSTRAR = 200;

export class ListarBitacoraReciente {
  constructor(private readonly dependencias: { bitacora: Bitacora }) {}

  ejecutar(): Promise<EntradaDeBitacoraDto[]> {
    return this.dependencias.bitacora.recientes(ENTRADAS_A_MOSTRAR);
  }
}
