import type { EvaluacionDeBancarizacion } from '../../../../core/contratos/libro-de-compras.contratos.js';
import type { BancarizacionDelLibro, PedidoDeEvaluacion } from '../../puertos/puertos-de-comprobantes.js';

/** La bancarización que dice el libro: se cambia `resultado` y se anota lo que se le pidió. */
export class BancarizacionFalsa implements BancarizacionDelLibro {
  resultado: EvaluacionDeBancarizacion['resultado'] = 'libre';
  pedidos: PedidoDeEvaluacion[] = [];

  async evaluar(_operador: unknown, pedido: PedidoDeEvaluacion): Promise<EvaluacionDeBancarizacion> {
    this.pedidos.push(pedido);
    const mensaje = this.resultado === 'libre' ? null : 'Bancarización: pasa del umbral.';
    return { resultado: this.resultado, mensaje, efecto: null, pagadoEnElMesCentavos: 0 };
  }
}
