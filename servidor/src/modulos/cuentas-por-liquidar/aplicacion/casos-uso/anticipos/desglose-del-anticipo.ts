import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import { MODULO_DE_ORIGEN, type Anticipo } from '../../../dominio/anticipos.js';
import type { RepartoDeLosGastos } from '../../puertos/puertos-de-anticipos.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { conceptosDelAnticipo } from './peticion-de-anticipo.js';

/** Lo gastado, de lo gastado lo de activo fijo, y lo que cubre el anticipo contra lo que se reembolsa. */
interface ReparticionDeLoGastado {
  entregaCentavos: number;
  entregaDeActivoCentavos: number;
  reembolsoCentavos: number;
  reembolsoDeActivoCentavos: number;
}

function reparticionDeLoGastado(montoCentavos: number, gastos: RepartoDeLosGastos): ReparticionDeLoGastado {
  const gastado = Math.max(gastos.totalCentavos, 0);
  const deActivo = Math.min(Math.max(gastos.deActivoCentavos, 0), gastado);
  const entregaCentavos = Math.min(gastado, montoCentavos);
  const entregaDeActivoCentavos = Math.min(deActivo, entregaCentavos);
  return {
    entregaCentavos,
    entregaDeActivoCentavos,
    reembolsoCentavos: gastado - entregaCentavos,
    reembolsoDeActivoCentavos: deActivo - entregaDeActivoCentavos,
  };
}

const sinCeros = (lineas: LineaDeConcepto[]): LineaDeConcepto[] =>
  lineas.filter(({ montoCentavos }) => montoCentavos > 0);

/**
 * El reparto por concepto del cheque o la nota de la entrega de un anticipo liquidado: lo gastado hasta el monto va a
 * «Gasto de anticipo» (o «…de activo»), lo no liquidado a «Anticipo no liquidado» y el resto (lo devuelto) sigue en
 * «Anticipo por liquidar», sin flujo. Sin líneas en cero.
 */
export function conceptosDeLaEntrega(
  anticipo: Pick<Anticipo, 'montoCentavos' | 'noLiquidadoCentavos'>,
  gastos: RepartoDeLosGastos,
): LineaDeConcepto[] {
  const { entregaCentavos, entregaDeActivoCentavos } = reparticionDeLoGastado(anticipo.montoCentavos, gastos);
  return sinCeros([
    { claveDeSistema: 'gasto_de_anticipo', montoCentavos: entregaCentavos - entregaDeActivoCentavos },
    { claveDeSistema: 'gasto_de_anticipo_de_activo', montoCentavos: entregaDeActivoCentavos },
    { claveDeSistema: 'anticipo_no_liquidado', montoCentavos: anticipo.noLiquidadoCentavos },
    {
      claveDeSistema: 'anticipo_por_liquidar',
      montoCentavos: anticipo.montoCentavos - entregaCentavos - anticipo.noLiquidadoCentavos,
    },
  ]);
}

/** El reparto del cheque o la nota del reembolso (lo gastado de más): todo es gasto, de activo fijo en lo que corresponda. */
export function conceptosDelReembolso(montoCentavos: number, gastos: RepartoDeLosGastos): LineaDeConcepto[] {
  const { reembolsoCentavos, reembolsoDeActivoCentavos } = reparticionDeLoGastado(montoCentavos, gastos);
  return sinCeros([
    { claveDeSistema: 'gasto_de_anticipo', montoCentavos: reembolsoCentavos - reembolsoDeActivoCentavos },
    { claveDeSistema: 'gasto_de_anticipo_de_activo', montoCentavos: reembolsoDeActivoCentavos },
  ]);
}

/**
 * Vuelve a fijar en Bancos el reparto por concepto del movimiento de la entrega (idempotente). Se llama al liquidar y al
 * reabrir; quien llama ya bloqueó el movimiento. Un anticipo abierto vuelve a ser todo «Anticipo por liquidar».
 */
export class DesgloseDelAnticipo {
  constructor(private readonly dependencias: Pick<DependenciasDeAnticipos, 'consultas' | 'bancos'>) {}

  async fijar(operador: Operador, anticipo: Anticipo): Promise<void> {
    const { consultas, bancos } = this.dependencias;
    const conceptos =
      anticipo.estado === 'liquidado'
        ? conceptosDeLaEntrega(anticipo, await consultas.repartoDeLosGastos(anticipo.id))
        : conceptosDelAnticipo(anticipo.montoCentavos);
    await bancos.fijarDesglose(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: anticipo.id },
      movimientoId: anticipo.movimientoId,
      conceptos,
    });
  }
}
