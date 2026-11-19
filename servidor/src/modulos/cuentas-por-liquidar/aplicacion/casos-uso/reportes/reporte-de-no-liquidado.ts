import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { PeriodoInvertido } from '../../../dominio/errores-de-reportes.js';
import { numeroDelAnticipo, type Anticipo, type DestinoDeLoNoLiquidado } from '../../../dominio/anticipos.js';
import { TITULOS_DE_DESTINO, valorDeCuotaEnCentavos } from '../../../dominio/antiguedad-de-anticipos.js';
import type { FilaDeNoLiquidadoDto, GrupoDeNoLiquidadoDto, ReporteDeNoLiquidadoDto } from '../../dto/reportes.dto.js';
import type { ConsultasDeReportesDeAnticipos } from '../../puertos/puertos-de-reportes.js';

export interface DependenciasDeNoLiquidado {
  unidadDeTrabajo: UnidadDeTrabajo;
  lecturas: ConsultasDeReportesDeAnticipos;
  reloj: Reloj;
}

export interface SolicitudDeNoLiquidado {
  /** Por omisión, el primer día del mes de `hasta`. */
  desde?: string;
  /** Por omisión, hoy. */
  hasta?: string;
  destino?: DestinoDeLoNoLiquidado;
}

export const LEYENDAS_DE_NO_LIQUIDADO = [
  'Cuenta lo que se dejó sin liquidar en el período, por la fecha de la liquidación; un anticipo reabierto deja de contar.',
  'Cobrar en cuotas, renta del trabajo y pérdida son las salidas posibles; las cuotas y la renta las ejecutará Planilla.',
  'El valor de la cuota se redondea hacia abajo: la última cuota lleva lo que sobre.',
];

const DESTINOS: DestinoDeLoNoLiquidado[] = ['cobrar', 'renta_del_trabajo', 'perdida'];

function filaDeNoLiquidado(anticipo: Anticipo): FilaDeNoLiquidadoDto {
  const cuotas = anticipo.destinoDeNoLiquidado === 'cobrar' ? anticipo.cuotas : null;
  return {
    id: anticipo.id,
    numero: numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero),
    beneficiarioId: anticipo.beneficiarioId,
    beneficiario: anticipo.beneficiario,
    esEmpleado: anticipo.esEmpleado,
    fechaDeLiquidacion: anticipo.fechaDeLiquidacion!,
    noLiquidado: deCentavos(anticipo.noLiquidadoCentavos),
    cuotas,
    valorDeCuota: cuotas ? deCentavos(valorDeCuotaEnCentavos(anticipo.noLiquidadoCentavos, cuotas)) : null,
    motivo: anticipo.motivoDeNoLiquidado ?? '',
  };
}

const sumar = (filas: readonly FilaDeNoLiquidadoDto[]): string =>
  deCentavos(filas.reduce((total, fila) => total + aCentavos(fila.noLiquidado), 0));

function grupoDe(destino: DestinoDeLoNoLiquidado, anticipos: Anticipo[]): GrupoDeNoLiquidadoDto {
  const filas = anticipos.filter((a) => a.destinoDeNoLiquidado === destino).map(filaDeNoLiquidado);
  return { destino, titulo: TITULOS_DE_DESTINO[destino], cantidad: filas.length, monto: sumar(filas), filas };
}

/**
 * CL-R2 (`reportes.ver`): lo que se dejó sin liquidar en un período, por destino (cobrar en cuotas, renta del trabajo,
 * pérdida), para Planilla y Contabilidad. Muestra siempre los tres destinos, o solo el pedido.
 */
export class ReporteDeNoLiquidado {
  constructor(private readonly dependencias: DependenciasDeNoLiquidado) {}

  /** @throws PeriodoInvertido si `desde` es posterior a `hasta`. */
  ejecutar(operador: Operador, solicitud: SolicitudDeNoLiquidado): Promise<ReporteDeNoLiquidadoDto> {
    const { unidadDeTrabajo, lecturas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hasta = solicitud.hasta ?? (await reloj.hoy(operador));
      const desde = solicitud.desde ?? `${hasta.slice(0, 7)}-01`;
      if (desde > hasta) throw new PeriodoInvertido();
      const anticipos = await lecturas.noLiquidados({ desde, hasta, destino: solicitud.destino });
      const destinos = solicitud.destino ? [solicitud.destino] : DESTINOS;
      const grupos = destinos.map((destino) => grupoDe(destino, anticipos));
      return {
        desde,
        hasta,
        grupos,
        total: {
          cantidad: grupos.reduce((suma, g) => suma + g.cantidad, 0),
          monto: deCentavos(grupos.reduce((suma, g) => suma + aCentavos(g.monto), 0)),
        },
        leyendas: LEYENDAS_DE_NO_LIQUIDADO,
      };
    });
  }
}
