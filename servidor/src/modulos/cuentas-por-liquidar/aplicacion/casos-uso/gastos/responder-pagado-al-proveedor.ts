import type { PagadoAlProveedorEnElMes } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { numeroDelAnticipo } from '../../../dominio/anticipos.js';
import type { ConsultasDeGastos } from '../../puertos/puertos-de-gastos.js';

/**
 * Responde la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` con lo gastado en anticipos con documentos del
 * proveedor en el mes (§7.2): suma `monto + monto_retenido` de los gastos asignados, vigentes y que no restan, siempre como
 * efectivo (el dinero salió del anticipo, ya en manos del beneficiario). Corre en la transacción de quien pregunta. Sin nada
 * que decir, responde `null`.
 */
export class ResponderPagadoAlProveedor {
  constructor(private readonly consultas: Pick<ConsultasDeGastos, 'pagadoAlProveedorEnElMes'>) {}

  async ejecutar(datos: { proveedorId: string; mes: string }): Promise<PagadoAlProveedorEnElMes | null> {
    const pagado = await this.consultas.pagadoAlProveedorEnElMes(datos.proveedorId, datos.mes);
    if (pagado.anticipos.length === 0) return null;
    return {
      efectivoCentavos: pagado.totalCentavos,
      bancarizadoCentavos: 0,
      comprobantes: pagado.anticipos.map(
        ({ numero, anioDeNumero }) => `Anticipo ${numeroDelAnticipo(numero, anioDeNumero)}`,
      ),
    };
  }
}
