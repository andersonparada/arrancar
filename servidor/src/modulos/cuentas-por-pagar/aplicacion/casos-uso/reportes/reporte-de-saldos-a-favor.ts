import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { clasificarSaldoAFavor, totalesDeSaldosAFavor } from '../../../dominio/saldos-a-favor.js';
import { filaDeSaldoAFavorDto, totalesDeSaldosAFavorDto } from '../../dto/dto-de-reportes-de-proveedor.js';
import type { ReporteDeSaldosAFavorDto } from '../../dto/reportes-de-proveedor.dto.js';
import { avisosDelCorte, LEYENDAS_DE_SALDOS } from './avisos-de-saldos.js';
import { baseDelCorte } from './base-del-corte.js';
import type { DependenciasDeReportesDeProveedor } from './reporte-de-estado-de-cuenta.js';

/** Los filtros de R4. */
export interface SolicitudDeSaldosAFavor {
  corte?: string;
  proveedorId?: string;
  /** Incluir también las notas que ya no tienen saldo libre. */
  incluirSinSaldo: boolean;
}

/** Lo que la prescripción pide decir siempre (dictamen 7 de `docs/modulos/dictamen-cp5-2026-11-15.md`). */
export const LEYENDAS_DE_PRESCRIPCION = [
  'La prescripción no opera sola: debe alegarse, y se interrumpe con un reconocimiento del proveedor o un pago parcial; Arrancar solo conoce los movimientos registrados aquí.',
  'Un saldo a favor prescrito no es por eso una cuenta incobrable deducible: consulte a su contador.',
];

/**
 * R4: las notas de crédito con saldo libre a un corte, con su último movimiento, los años desde entonces y la fecha desde la
 * que podrían estar prescritas (cinco años, Código Civil art. 1508).
 */
export class ReporteDeSaldosAFavor {
  constructor(private readonly dependencias: DependenciasDeReportesDeProveedor) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeSaldosAFavor): Promise<ReporteDeSaldosAFavorDto> {
    const { unidadDeTrabajo, consultas, consultasDeProveedor } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const base = await baseDelCorte(this.dependencias, operador, { ...solicitud, autorizacion: 'todos' });
      const notas = await consultasDeProveedor.notasConSaldoAlCorte({
        ...base,
        incluirSinSaldo: solicitud.incluirSinSaldo,
      });
      const filas = notas.map((nota) => clasificarSaldoAFavor(nota, base.corte));
      return {
        corte: base.corte,
        fechaDeInicio: base.fechaDeInicio,
        filas: filas.map(filaDeSaldoAFavorDto),
        ...totalesDeSaldosAFavorDto(totalesDeSaldosAFavor(filas)),
        avisos: avisosDelCorte(await consultas.avisosDelCorte(base), base),
        leyendas: [...LEYENDAS_DE_PRESCRIPCION, ...LEYENDAS_DE_SALDOS],
      };
    });
  }
}
