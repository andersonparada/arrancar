import type { BaseDatos, Transaccion } from '../../../base-datos/conexion.js';
import { fijarVariablesDeCuenta } from '../../../compartido/infraestructura/variables-de-seguridad.js';
import type { OrigenDelAlta, PiezasDeAlta, TransaccionDeAlta } from '../../aplicacion/puertos/transaccion-de-alta.js';

/**
 * Abre la transacción, fija la cuenta nueva y el usuario de soporte (sin empresa: aún no existe) y le entrega al
 * alta las piezas atadas a ella.
 */
export class TransaccionDeAltaPostgres implements TransaccionDeAlta {
  constructor(
    private readonly bd: BaseDatos,
    private readonly piezasEn: (tx: Transaccion) => PiezasDeAlta,
  ) {}

  ejecutar<Resultado>(
    origen: OrigenDelAlta,
    trabajo: (piezas: PiezasDeAlta) => Promise<Resultado>,
  ): Promise<Resultado> {
    return this.bd.transaction(async (tx) => {
      await fijarVariablesDeCuenta(tx, origen);
      return trabajo(this.piezasEn(tx));
    });
  }
}
