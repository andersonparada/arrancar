import type { PagadoAlProveedorEnElMes } from '../../../../core/contratos/libro-de-compras.contratos.js';
import type { PagosDeCajaChica } from '../../puertos/puertos-de-comprobantes.js';

/**
 * Responde la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` (§5.4 h) con lo que los fondos de la empresa
 * pagaron en efectivo al proveedor en el mes: los comprobantes de documento asignados, vigentes y que no restan, con su
 * valor antes de retenciones (`monto + monto_retenido`). Suma **todos** los fondos, también los que el usuario no ve (por
 * eso la lee una función `security definer`). Sin nada que decir responde `null`.
 */
export class ResponderPagadoAlProveedor {
  constructor(private readonly pagos: PagosDeCajaChica) {}

  async ejecutar(datos: { proveedorId: string; mes: string }): Promise<PagadoAlProveedorEnElMes | null> {
    const { totalCentavos, cantidad } = await this.pagos.delProveedorEnElMes(datos.proveedorId, datos.mes);
    if (cantidad === 0) return null;
    return {
      efectivoCentavos: totalCentavos,
      bancarizadoCentavos: 0,
      comprobantes: [`Caja chica: ${cantidad} ${cantidad === 1 ? 'comprobante' : 'comprobantes'}`],
    };
  }
}
