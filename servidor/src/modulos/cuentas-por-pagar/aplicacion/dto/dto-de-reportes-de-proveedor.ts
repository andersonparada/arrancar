import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { diasEntre } from '../../dominio/fechas-de-corte.js';
import type { LineaDelEstado, TotalesDelEstado } from '../../dominio/estado-de-cuenta.js';
import { TRAMOS_DE_PRESCRIPCION, type TramoDePrescripcion } from '../../dominio/prescripcion-de-saldos.js';
import type { SaldoAFavorClasificado, TotalesDeSaldosAFavor } from '../../dominio/saldos-a-favor.js';
import type { ContrasenaPorPagar } from '../puertos/puertos-de-reportes-de-proveedor.js';
import type {
  FilaDeContrasenaPorPagarDto,
  FilaDeSaldoAFavorDto,
  LineaDelEstadoDto,
  ReporteDeSaldosAFavorDto,
  TotalesDelEstadoDto,
} from './reportes-de-proveedor.dto.js';

/** El monto de una columna del estado de cuenta; vacío (`null`) si en esa línea no hay nada. */
const columnaONula = (centavos: number): string | null => (centavos === 0 ? null : deCentavos(centavos));

const centavosONulos = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

export function lineaDelEstadoDto(linea: LineaDelEstado): LineaDelEstadoDto {
  return {
    fecha: linea.fecha,
    hecho: linea.hecho,
    documentoId: linea.documentoId,
    concepto: linea.concepto,
    total: centavosONulos(linea.totalCentavos),
    retenciones: centavosONulos(linea.retencionesCentavos),
    anterioresAlInicio: centavosONulos(linea.anterioresAlInicioCentavos),
    cargo: columnaONula(linea.cargoCentavos),
    abono: columnaONula(linea.abonoCentavos),
    saldo: centavosONulos(linea.saldoCentavos),
    anulada: linea.anulada,
  };
}

export const totalesDelEstadoDto = (totales: TotalesDelEstado): TotalesDelEstadoDto => ({
  saldoAnterior: deCentavos(totales.saldoAnteriorCentavos),
  cargos: deCentavos(totales.cargosCentavos),
  abonos: deCentavos(totales.abonosCentavos),
  saldoFinal: deCentavos(totales.saldoFinalCentavos),
});

export function filaDeSaldoAFavorDto(nota: SaldoAFavorClasificado): FilaDeSaldoAFavorDto {
  return {
    id: nota.id,
    proveedorId: nota.proveedorId,
    proveedorNombre: nota.proveedorNombre,
    proveedorNit: nota.proveedorNit,
    serie: nota.serie,
    numero: nota.numero,
    fechaEmision: nota.fechaEmision,
    base: deCentavos(nota.baseCentavos),
    aplicado: deCentavos(nota.aplicadoCentavos),
    ajustado: deCentavos(nota.ajustadoCentavos),
    reintegrado: deCentavos(nota.reintegradoCentavos),
    saldoLibre: deCentavos(nota.saldoCentavos),
    ultimoMovimiento: nota.ultimoMovimiento,
    aniosDesdeElUltimoMovimiento: nota.aniosDesdeElUltimoMovimiento,
    tramo: nota.tramo,
    posiblePrescripcionDesde: nota.posiblePrescripcionDesde,
    posiblementePrescrito: nota.posiblementePrescrito,
    enContrasena: nota.enContrasena,
  };
}

export function totalesDeSaldosAFavorDto(
  totales: TotalesDeSaldosAFavor,
): Pick<ReporteDeSaldosAFavorDto, 'totalesPorTramo' | 'total' | 'posiblementePrescrito'> {
  const porTramo = Object.fromEntries(
    TRAMOS_DE_PRESCRIPCION.map((tramo) => [tramo, deCentavos(totales.porTramo[tramo])]),
  ) as Record<TramoDePrescripcion, string>;
  return {
    totalesPorTramo: porTramo,
    total: deCentavos(totales.totalCentavos),
    posiblementePrescrito: {
      cantidad: totales.posiblementePrescritas,
      total: deCentavos(totales.posiblementePrescritoCentavos),
    },
  };
}

export const filaDeContrasenaPorPagarDto = (c: ContrasenaPorPagar, hoy: string): FilaDeContrasenaPorPagarDto => ({
  id: c.id,
  numero: c.numero,
  proveedorId: c.proveedorId,
  proveedorNombre: c.proveedorNombre,
  fecha: c.fecha,
  pagoPrometido: c.pagoPrometido,
  diasDeAtraso: Math.max(0, diasEntre(c.pagoPrometido, hoy)),
  vence: c.vence,
  documentosConSaldo: c.documentosConSaldo,
  saldo: deCentavos(c.saldoCentavos),
  autorizado: deCentavos(c.autorizadoCentavos),
  sinAutorizar: deCentavos(c.sinAutorizarCentavos),
  comprometido: deCentavos(c.comprometidoCentavos),
  impresa: c.impresa,
});
