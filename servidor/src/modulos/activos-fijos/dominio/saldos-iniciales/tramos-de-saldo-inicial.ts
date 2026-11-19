import { abrirTramoContable } from '../depreciacion/libro-contable.js';
import { abrirTramoFiscal } from '../depreciacion/libro-fiscal.js';
import { periodoDe } from '../depreciacion/meses.js';
import type { TramoCalculado } from '../depreciacion/tramo.js';
import type { DatosDeSaldoInicial } from './saldo-inicial.js';

export interface EntradaDeTramosDeSaldoInicial {
  /** La fecha de inicio de la empresa: el tramo empieza en su mes, sin importar la regla del primer mes (§8). */
  fechaDeInicio: string;
  datos: DatosDeSaldoInicial;
}

/**
 * Los dos tramos `saldo_inicial` de un activo que ya se depreciaba (§8): lo que falta por depreciar en cada libro desde el
 * mes de la fecha de inicio. Sin vida restante no hay tramo contable (la cuota sería indefinida) y el aviso
 * `vida_agotada_con_saldo` lo señala al cerrar la carga.
 */
export function tramosDeSaldoInicial({ fechaDeInicio, datos }: EntradaDeTramosDeSaldoInicial): TramoCalculado[] {
  const desdePeriodo = periodoDe(fechaDeInicio);
  const meses = datos.vidaUtilRestanteMeses;
  const contable =
    meses !== null && meses >= 1
      ? [
          abrirTramoContable({
            desdePeriodo,
            causa: 'saldo_inicial',
            costoCentavos: datos.costoCentavos,
            acumuladaCentavos: datos.acumuladaContableCentavos,
            valorResidualCentavos: datos.valorResidualCentavos,
            meses,
          }),
        ]
      : [];
  const fiscal = abrirTramoFiscal({
    desdePeriodo,
    causa: 'saldo_inicial',
    baseFiscalCentavos: datos.baseFiscalCentavos,
    acumuladaCentavos: datos.acumuladaFiscalCentavos,
    porcentaje: datos.porcentajeFiscal,
  });
  return [...contable, fiscal];
}
