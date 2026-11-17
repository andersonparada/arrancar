import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { CausaDeAjuste } from '../../../dominio/ajustes.js';
import { limitesDelMes, mesAnteriorDe } from '../../../dominio/meses-de-reporte.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import {
  filaDeAjusteDto,
  filaDeAplicacionManualDto,
  filaDeDocumentoRevertidoDto,
  filaDePagoAAperturaDto,
} from '../../dto/dto-de-reportes-de-control.js';
import type {
  FilaDeAjusteDelMesDto,
  FilaDeAplicacionManualDto,
  FilaDeDocumentoRevertidoDto,
  FilaDePagoAAperturaDto,
  ReporteDeAjustesDelMesDto,
  TotalPorCausaDto,
} from '../../dto/reportes-de-control.dto.js';
import type {
  ConsultasDeReportesDeControl,
  FiltroDeAjustesDelMes,
} from '../../puertos/puertos-de-reportes-de-control.js';
import type { DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Lo que necesita el reporte de ajustes del mes. */
export interface DependenciasDeReportesDeControl extends DependenciasDeReportesDeSaldos {
  consultasDeControl: ConsultasDeReportesDeControl;
}

export const LEYENDAS_DE_AJUSTES = [
  'Los ajustes se muestran con su efecto: pérdida, transitoria o ingreso (diferencia de centavos de un cargo).',
  'Un documento de un mes anterior que se anuló o se devolvió a revisión puede obligar a rectificar el IVA de ese mes: consulte a su contador.',
];

export interface SolicitudDeAjustesDelMes {
  /** `AAAA-MM`; por omisión, el mes anterior (se revisa al cerrar). */
  mes?: string;
  proveedorId?: string;
  causa?: CausaDeAjuste;
}

interface Sumable {
  monto: string;
}

const sumaDe = (filas: readonly Sumable[]) => ({
  cantidad: filas.length,
  monto: deCentavos(filas.reduce((total, fila) => total + aCentavos(fila.monto), 0)),
});

/** Los ajustes vigentes agrupados por causa (y su efecto), en el orden en que aparecen. */
function totalesPorCausa(ajustes: readonly FilaDeAjusteDelMesDto[]): TotalPorCausaDto[] {
  const grupos = new Map<string, FilaDeAjusteDelMesDto[]>();
  for (const ajuste of ajustes.filter(({ estado }) => estado === 'vigente')) {
    const clave = `${ajuste.causa}|${ajuste.efecto}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), ajuste]);
  }
  return [...grupos.values()].map((grupo) => ({
    causa: grupo[0]!.causa,
    efecto: grupo[0]!.efecto,
    ...sumaDe(grupo),
  }));
}

interface LoLeido {
  ajustes: FilaDeAjusteDelMesDto[];
  otros: FilaDeAjusteDelMesDto[];
  manuales: FilaDeAplicacionManualDto[];
  apertura: FilaDePagoAAperturaDto[];
  anulados: FilaDeDocumentoRevertidoDto[];
  devueltos: FilaDeDocumentoRevertidoDto[];
}

const deDocumentos = (filas: readonly FilaDeDocumentoRevertidoDto[]) =>
  sumaDe(filas.map(({ total }) => ({ monto: total })));

/** Las cinco secciones con sus totales. */
function armarReporte(mes: string, leido: LoLeido): ReporteDeAjustesDelMesDto {
  const { ajustes, otros, manuales, apertura, anulados, devueltos } = leido;
  return {
    mes,
    ajustes,
    anulacionesDeOtrosMeses: otros,
    aplicacionesManuales: manuales,
    pagosAApertura: apertura,
    documentosAnulados: anulados,
    documentosDesautorizados: devueltos,
    totales: {
      porCausa: totalesPorCausa(ajustes),
      ajustesAnulados: sumaDe(ajustes.filter(({ estado }) => estado === 'anulado')),
      porSeccion: {
        ajustes: sumaDe(ajustes),
        anulacionesDeOtrosMeses: sumaDe(otros),
        aplicacionesManuales: sumaDe(manuales),
        pagosAApertura: sumaDe(apertura),
        documentosAnulados: deDocumentos(anulados),
        documentosDesautorizados: deDocumentos(devueltos),
      },
    },
    leyendas: LEYENDAS_DE_AJUSTES,
  };
}

/**
 * R8: lo que se movió en un mes y el contador debe revisar al cerrarlo: ajustes de saldo (también las anulaciones del
 * mes de ajustes de otras fechas), compensaciones manuales, pagos contra la cuenta de apertura y los documentos anulados
 * o devueltos a revisión, con la marca de los que son de un mes anterior.
 */
export class ReporteDeAjustesDelMes {
  constructor(private readonly dependencias: DependenciasDeReportesDeControl) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeAjustesDelMes): Promise<ReporteDeAjustesDelMesDto> {
    const { unidadDeTrabajo, reloj, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const mes = solicitud.mes ?? mesAnteriorDe(await reloj.hoy(operador));
      if (solicitud.proveedorId && !(await consultas.proveedorExiste(solicitud.proveedorId))) {
        throw new ProveedorDelReporteNoExiste();
      }
      const filtro = { ...limitesDelMes(mes), empresaId: operador.empresaId, ...solicitud };
      return armarReporte(mes, await this.leer(filtro));
    });
  }

  private async leer(filtro: FiltroDeAjustesDelMes): Promise<LoLeido> {
    const control = this.dependencias.consultasDeControl;
    return {
      ajustes: (await control.ajustes(filtro, 'del_mes')).map(filaDeAjusteDto),
      otros: (await control.ajustes(filtro, 'anulados_de_otros_meses')).map(filaDeAjusteDto),
      manuales: (await control.aplicacionesManuales(filtro)).map(filaDeAplicacionManualDto),
      apertura: (await control.pagosAApertura(filtro)).map(filaDePagoAAperturaDto),
      anulados: (await control.documentosAnulados(filtro)).map((d) => filaDeDocumentoRevertidoDto(d, filtro.desde)),
      devueltos: (await control.documentosDesautorizados(filtro)).map((d) =>
        filaDeDocumentoRevertidoDto(d, filtro.desde),
      ),
    };
  }
}
