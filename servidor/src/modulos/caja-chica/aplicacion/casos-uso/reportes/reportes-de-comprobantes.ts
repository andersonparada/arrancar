import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PoliticaDeZonaHoraria, Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { PeriodoInvertido } from '../../../dominio/errores-de-reportes.js';
import type { ReporteDePendientesDto, ReporteSinDocumentoDto } from '../../dto/reportes.dto.js';
import type { LecturasDeReportesDeCajaChica } from '../../puertos/puertos-de-reportes.js';
import { agruparPorFondo, totalDe } from './armado-de-reportes.js';

export interface DependenciasDeReportes {
  unidadDeTrabajo: UnidadDeTrabajo;
  lecturas: LecturasDeReportesDeCajaChica;
  reloj: Reloj;
  /** La zona horaria de la empresa, para dar el día de un arqueo. */
  zonaHoraria: PoliticaDeZonaHoraria;
}

export interface SolicitudAlCorte {
  /** Por omisión, hoy. */
  corte?: string;
  fondoId?: string;
}

export interface SolicitudDePeriodo {
  /** Por omisión, el primer día del mes de `hasta`. */
  desde?: string;
  /** Por omisión, hoy. */
  hasta?: string;
  fondoId?: string;
}

/** El período pedido con sus valores por omisión; `desde` posterior a `hasta` no es válido. */
export async function periodoDe(
  { reloj }: Pick<DependenciasDeReportes, 'reloj'>,
  por: { operador: Operador; solicitud: SolicitudDePeriodo },
): Promise<{ desde: string; hasta: string }> {
  const hasta = por.solicitud.hasta ?? (await reloj.hoy(por.operador));
  const desde = por.solicitud.desde ?? `${hasta.slice(0, 7)}-01`;
  if (desde > hasta) throw new PeriodoInvertido();
  return { desde, hasta };
}

export const LEYENDAS_DE_PENDIENTES = [
  'Es lo gastado del fondo que, al corte, todavía no estaba en una reposición vigente: el gasto que Contabilidad reconoce en su período aunque la reposición llegue después.',
  'Cuenta por la fecha del comprobante; un comprobante anulado después del corte y una reposición anulada después del corte cuentan como estaban ese día.',
  'Las notas de crédito y los sobrantes restan. Solo son deducibles los documentos que quedaron dentro del libro de compras.',
];

/**
 * CC-R1 (`reportes.ver`): los comprobantes pendientes de reponer al corte, por fondo, para que Contabilidad reconozca
 * el gasto del período (dictamen C3). Cada usuario ve solo los fondos que tiene asignados.
 */
export class ReporteDePendientesDeReponer {
  constructor(private readonly dependencias: DependenciasDeReportes) {}

  ejecutar(operador: Operador, solicitud: SolicitudAlCorte): Promise<ReporteDePendientesDto> {
    const { unidadDeTrabajo, lecturas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const corte = solicitud.corte ?? (await reloj.hoy(operador));
      const elementos = await lecturas.pendientesAlCorte({ corte, fondoId: solicitud.fondoId });
      return {
        corte,
        fondos: agruparPorFondo(elementos, false),
        total: totalDe(elementos),
        leyendas: LEYENDAS_DE_PENDIENTES,
      };
    });
  }
}

export const LEYENDAS_SIN_DOCUMENTO = [
  'Son los vales de gasto y los documentos que quedaron fuera del libro de compras: no dan crédito fiscal y no son deducibles.',
  'Cuenta por la fecha del comprobante, aunque ya se haya repuesto; los anulados no cuentan.',
];

/** CC-R3 (`reportes.ver`): los gastos del período sin documento fiscal válido, por fondo, siempre no deducibles. */
export class ReporteDeGastosSinDocumento {
  constructor(private readonly dependencias: DependenciasDeReportes) {}

  /** @throws PeriodoInvertido si `desde` es posterior a `hasta`. */
  ejecutar(operador: Operador, solicitud: SolicitudDePeriodo): Promise<ReporteSinDocumentoDto> {
    const { unidadDeTrabajo, lecturas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const periodo = await periodoDe(this.dependencias, { operador, solicitud });
      const elementos = await lecturas.sinDocumentoFiscal({ ...periodo, fondoId: solicitud.fondoId });
      return {
        ...periodo,
        fondos: agruparPorFondo(elementos, true),
        total: totalDe(elementos),
        leyendas: LEYENDAS_SIN_DOCUMENTO,
      };
    });
  }
}
