import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { BajaInvalida } from '../../../dominio/errores-de-baja.js';
import type { BajaDto, SolicitudDeBaja } from '../../dto/baja.dto.js';
import type { RegistradorDeBajas } from './registrador-de-bajas.js';

/** Vende un activo con sus componentes: la baja con causa `venta`, el comprador y la factura emitida afuera. */
export class RegistrarVenta {
  constructor(private readonly registrador: RegistradorDeBajas) {}

  /**
   * Como `DarDeBaja`, y además guarda la venta (comprador, NIT, precio, IVA y factura FEL) y calcula el resultado
   * contable (precio − valor en libros) y fiscal (precio − (costo fiscal − depreciación fiscal acumulada), A1). Con
   * componentes, el precio y el IVA se reparten en proporción a su costo. El cobro se registra aparte en Bancos.
   * @throws BajaInvalida si falta la venta o la causa no es `venta`.
   * @throws PrecioNoRepartible si el precio no alcanza para repartirlo entre los componentes.
   * Además, los errores de `DarDeBaja`.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeBaja): Promise<BajaDto> {
    if (solicitud.causa !== 'venta' || !solicitud.venta)
      throw new BajaInvalida('Una venta lleva la causa «venta» y los datos del comprador y de la factura.');
    const baja = await this.registrador.ejecutar(operador, solicitud);
    return baja;
  }
}
