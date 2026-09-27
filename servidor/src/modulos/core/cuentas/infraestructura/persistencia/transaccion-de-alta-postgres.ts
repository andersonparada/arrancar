import type { BaseDatos, Transaccion } from '../../../base-datos/conexion.js';
import type { PiezasDeAlta, TransaccionDeAlta } from '../../aplicacion/puertos/transaccion-de-alta.js';

/** Abre la transacción y le entrega al alta las piezas atadas a ella. */
export class TransaccionDeAltaPostgres implements TransaccionDeAlta {
  constructor(
    private readonly bd: BaseDatos,
    private readonly piezasEn: (tx: Transaccion) => PiezasDeAlta,
  ) {}

  ejecutar<Resultado>(trabajo: (piezas: PiezasDeAlta) => Promise<Resultado>): Promise<Resultado> {
    return this.bd.transaction((tx) => trabajo(this.piezasEn(tx)));
  }
}
