import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { filaDeDocumentoDto, totalesDeDocumentosDto } from '../../dto/dto-de-saldos-al-corte.js';
import type { ReporteDeDocumentosAUnaFechaDto } from '../../dto/saldos-al-corte.dto.js';
import type { PaginacionDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type { FiltroDeDocumentosAlCorte } from '../../puertos/puertos-de-saldos-al-corte.js';
import { avisosDelCorte, LEYENDAS_DE_SALDOS } from './avisos-de-saldos.js';
import { baseDelCorte, type DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Los filtros de R2: lo común del corte más los propios del detalle; el corte y la fecha de inicio los fija el reporte. */
export type SolicitudDeDocumentosAUnaFecha = Omit<
  FiltroDeDocumentosAlCorte,
  'empresaId' | 'corte' | 'fechaDeInicio'
> & {
  corte?: string;
};

/**
 * R2: los cargos con su saldo a una fecha de corte (pendientes, vencidos, por vencer, sin contraseña, por estado de pago…).
 * Con `pagina` entrega esa página y los totales de todo lo filtrado; sin ella (Excel), todos los cargos.
 */
export class ReporteDeDocumentosAUnaFecha {
  constructor(private readonly dependencias: DependenciasDeReportesDeSaldos) {}

  ejecutar(
    operador: Operador,
    solicitud: SolicitudDeDocumentosAUnaFecha,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<ReporteDeDocumentosAUnaFechaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const base = await baseDelCorte(this.dependencias, operador, solicitud);
      const resultado = await consultas.documentos({ ...solicitud, ...base }, pagina);
      const avisos = avisosDelCorte(await consultas.avisosDelCorte(base), base);
      return {
        corte: base.corte,
        fechaDeInicio: base.fechaDeInicio,
        filas: resultado.filas.map((fila) => filaDeDocumentoDto(fila, base.corte)),
        total: resultado.totales.cantidad,
        pagina: pagina?.pagina ?? 1,
        limite: pagina?.limite ?? null,
        totales: totalesDeDocumentosDto(resultado.totales),
        avisos,
        leyendas: LEYENDAS_DE_SALDOS,
      };
    });
  }
}
