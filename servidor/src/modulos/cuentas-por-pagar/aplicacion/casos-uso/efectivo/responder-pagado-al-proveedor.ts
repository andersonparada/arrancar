import type { PagadoAlProveedorEnElMes } from '../../../../core/contratos/libro-de-compras.contratos.js';
import type { ConsultasDePagos } from '../../puertos/puertos-de-pagos.js';

/**
 * Responde la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes` con los pagos vigentes del proveedor en el mes (§5.3:
 * cheques, notas de débito, notas ligadas y efectivo; no la cuenta de apertura), antes de retenciones. Corre en la transacción
 * de quien pregunta, así que ve los pagos de la empresa activa. Siempre responde: sin pagos, con ceros.
 */
export class ResponderPagadoAlProveedor {
  constructor(private readonly consultasDePagos: Pick<ConsultasDePagos, 'pagosDelMes'>) {}

  async ejecutar(datos: { proveedorId: string; mes: string }): Promise<PagadoAlProveedorEnElMes> {
    const pagos = await this.consultasDePagos.pagosDelMes(datos.proveedorId, datos.mes);
    const enEfectivo = pagos.filter(({ forma }) => forma === 'efectivo');
    const suma = (lista: typeof pagos) => lista.reduce((total, { montoCentavos }) => total + montoCentavos, 0);
    return {
      efectivoCentavos: suma(enEfectivo),
      bancarizadoCentavos: suma(pagos) - suma(enEfectivo),
      comprobantes: pagos.map(({ numero, anioDeNumero }) => `Recibo ${numero}/${anioDeNumero}`),
    };
  }
}
