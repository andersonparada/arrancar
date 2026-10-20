import { reactive } from 'vue';
import { apiRetenciones, type RetencionDelMes } from '../../servicios/retenciones.api';
import { usarAccionConMotivo } from './usar-accion-con-motivo';
import { usarConstancias } from './usar-constancias';
import { usarPagoDeEntero } from './usar-pago-de-entero';

/** Lo que se hace desde el mes: anotar o corregir constancias, quitarlas y registrar un pago. Todo recarga el reporte. */
export function usarAccionesDelMes(recargar: () => Promise<void>) {
  return {
    constancias: reactive(usarConstancias(recargar)),
    pago: reactive(usarPagoDeEntero(recargar)),
    quitar: reactive(
      usarAccionConMotivo(
        (retencion: RetencionDelMes, motivo: string) => apiRetenciones.quitarConstancia(retencion.id, motivo),
        recargar,
        'Constancia quitada.',
      ),
    ),
  };
}
