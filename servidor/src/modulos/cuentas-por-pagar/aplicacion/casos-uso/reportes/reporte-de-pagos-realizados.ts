import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { RangoDeReporteInvalido, RangoDeReporteMuyLargo } from '../../../dominio/errores-de-reportes.js';
import { mesesEntre, primerDiaDelMes } from '../../../dominio/fechas-de-corte.js';
import type { FormaDePago } from '../../../dominio/pagos.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import type { ReporteDePagosRealizadosDto, SumaDePagosDto } from '../../dto/reportes-de-pagos.dto.js';
import type { PaginacionDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type {
  EstadoPedidoDePagos,
  ConsultasDeReportesDePagos,
  TotalDePagosPorForma,
} from '../../puertos/puertos-de-reportes-de-pagos.js';
import type { DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Lo que necesitan los reportes de pagos. */
export interface DependenciasDeReportesDePagos extends DependenciasDeReportesDeSaldos {
  consultasDePagos: ConsultasDeReportesDePagos;
}

const MAXIMO_DE_MESES = 24;

export const LEYENDAS_DE_PAGOS = [
  '«Misma persona»: quien registró o autorizó el documento también registró el pago. Es una marca de control, no una infracción.',
  'Cada fila es un documento pagado: el pago se repite en cada línea y los totales suman las líneas.',
];

/** Los filtros de R6; `desde` y `hasta` son del mes en curso si faltan. */
export interface SolicitudDePagosRealizados {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  forma?: FormaDePago;
  cuentaBancariaId?: string;
  estado: EstadoPedidoDePagos;
  posfechados: boolean;
  mismaPersona: boolean;
}

const sumar = (filas: readonly TotalDePagosPorForma[], estado: 'vigente' | 'anulado'): SumaDePagosDto => {
  const delEstado = filas.filter((fila) => fila.estado === estado);
  const monto = delEstado.reduce((total, fila) => total + aCentavos(fila.monto), 0);
  const retencion = delEstado.reduce((total, fila) => total + aCentavos(fila.retencion), 0);
  return {
    lineas: delEstado.reduce((total, fila) => total + fila.lineas, 0),
    monto: deCentavos(monto),
    retencionDescontada: deCentavos(retencion),
    cubre: deCentavos(monto + retencion),
  };
};

/** El rango pedido con sus omisiones (el mes en curso), validado: `desde <= hasta` y no más de 24 meses. */
function rangoDe(solicitud: SolicitudDePagosRealizados, hoy: string): { desde: string; hasta: string } {
  const hasta = solicitud.hasta ?? hoy;
  const desde = solicitud.desde ?? primerDiaDelMes(hasta);
  if (desde > hasta) throw new RangoDeReporteInvalido();
  if (mesesEntre(desde, hasta) > MAXIMO_DE_MESES) throw new RangoDeReporteMuyLargo(MAXIMO_DE_MESES);
  return { desde, hasta };
}

/** Las sumas del reporte: por forma y estado, y las de vigentes y anulados. */
function totalesDe(filas: readonly TotalDePagosPorForma[]): ReporteDePagosRealizadosDto['totales'] {
  return {
    porForma: filas.map((fila) => ({
      ...fila,
      cubre: deCentavos(aCentavos(fila.monto) + aCentavos(fila.retencion)),
    })),
    vigentes: sumar(filas, 'vigente'),
    anulados: sumar(filas, 'anulado'),
  };
}

/**
 * R6: los pagos del rango (por omisión el mes en curso) en líneas, con quién registró el documento, quién lo autorizó
 * y quién registró el pago, y la marca de «misma persona». Con `pagina` entrega esa página; sin ella (Excel), todo.
 */
export class ReporteDePagosRealizados {
  constructor(private readonly dependencias: DependenciasDeReportesDePagos) {}

  ejecutar(
    operador: Operador,
    solicitud: SolicitudDePagosRealizados,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<ReporteDePagosRealizadosDto> {
    const { unidadDeTrabajo, reloj, consultasDePagos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const rango = rangoDe(solicitud, await reloj.hoy(operador));
      await this.exigirProveedor(solicitud.proveedorId);
      const filtro = { ...solicitud, empresaId: operador.empresaId, ...rango };
      const resultado = await consultasDePagos.pagosRealizados(filtro, pagina);
      return {
        ...rango,
        filas: resultado.filas,
        total: resultado.total,
        pagina: pagina?.pagina ?? 1,
        limite: pagina?.limite ?? null,
        totales: totalesDe(resultado.totales),
        leyendas: LEYENDAS_DE_PAGOS,
      };
    });
  }

  private async exigirProveedor(proveedorId: string | undefined): Promise<void> {
    if (proveedorId && !(await this.dependencias.consultas.proveedorExiste(proveedorId))) {
      throw new ProveedorDelReporteNoExiste();
    }
  }
}
