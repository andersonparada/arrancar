import { pedidoEnCentavos } from '../pagos/comunes-del-registro.js';
import type { PeticionDeEfectivo } from '../pagos/peticion-de-pago.js';
import { RevisorDelPago } from '../pagos/revisor-del-pago.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import { enElPago } from './errores-por-pago.js';
import type { PagoPedido, PagoRevisado, PeticionDeReparto } from './peticion-de-efectivo.js';

type Dependencias = Pick<DependenciasDeEfectivo, 'documentos' | 'consultas' | 'contrasenas'>;

/**
 * Pasa cada pago del reparto a centavos y revisa sus cargos (son del proveedor, están autorizados y en una contraseña vigente
 * y cada monto cabe en su saldo). Cualquier error se da con el índice del pago, para mostrarlo en su proveedor. Se usa dos
 * veces: sin bloquear, para saber qué bloquear, y con todo bloqueado, por si otro pago llegó primero.
 */
export class RevisorDelReparto {
  private readonly revisor: RevisorDelPago;

  constructor(dependencias: Dependencias) {
    this.revisor = new RevisorDelPago(dependencias);
  }

  /** @throws PagoSinDocumentos, DemasiadosDocumentosEnPago, MontoDePagoInvalido, CargoRepetido (con el índice del pago). */
  async pedidos({ retiroId, pagos }: PeticionDeReparto): Promise<PagoPedido[]> {
    const pedidos: PagoPedido[] = [];
    for (const [indice, pago] of pagos.entries()) {
      const peticion: PeticionDeEfectivo = { forma: 'efectivo', retiroId, ...pago };
      pedidos.push({ indice, peticion, pedidas: await enElPago(indice, () => pedidoEnCentavos(peticion)) });
    }
    return pedidos;
  }

  /** @throws CargoNoDisponible, DocumentoFueraDeLaContrasena, DocumentoSinAutorizar, PagoMayorQueElSaldo (con el índice del pago). */
  async revisar(pedidos: readonly PagoPedido[]): Promise<PagoRevisado[]> {
    const revisados: PagoRevisado[] = [];
    for (const pedido of pedidos) {
      const { indice, peticion, pedidas } = pedido;
      const lineas = await enElPago(indice, () => this.revisor.revisar(peticion.proveedorId, pedidas.lineas));
      revisados.push({ ...pedido, lineas });
    }
    return revisados;
  }
}
