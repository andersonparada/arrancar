import {
  aniosDesdeElUltimoMovimiento,
  posiblePrescripcionDesde,
  posiblementePrescrito,
  TRAMOS_DE_PRESCRIPCION,
  tramoDePrescripcion,
  type TramoDePrescripcion,
} from './prescripcion-de-saldos.js';

/**
 * Los saldos a favor (R4): cada nota de crédito con saldo libre al corte y su antigüedad desde el último movimiento, que es
 * lo que decide cuándo podría prescribir (Código Civil arts. 1506 a 1508; `docs/modulos/diseno-cp5-reportes.md`).
 */

/** Una nota de crédito al corte, con lo que la consulta sabe de ella. */
export interface NotaAlCorte {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  baseCentavos: number;
  aplicadoCentavos: number;
  ajustadoCentavos: number;
  reintegradoCentavos: number;
  saldoCentavos: number;
  /** La mayor fecha entre la emisión y las de sus aplicaciones, ajustes y reintegros vigentes al corte. */
  ultimoMovimiento: string;
  enContrasena: boolean;
}

export interface SaldoAFavorClasificado extends NotaAlCorte {
  aniosDesdeElUltimoMovimiento: number;
  tramo: TramoDePrescripcion;
  posiblePrescripcionDesde: string;
  posiblementePrescrito: boolean;
}

/** La antigüedad y la posible prescripción de una nota al corte. */
export function clasificarSaldoAFavor(nota: NotaAlCorte, corte: string): SaldoAFavorClasificado {
  const anios = aniosDesdeElUltimoMovimiento(nota.ultimoMovimiento, corte);
  return {
    ...nota,
    aniosDesdeElUltimoMovimiento: anios,
    tramo: tramoDePrescripcion(anios),
    posiblePrescripcionDesde: posiblePrescripcionDesde(nota.ultimoMovimiento),
    posiblementePrescrito: posiblementePrescrito(nota.ultimoMovimiento, corte),
  };
}

export interface TotalesDeSaldosAFavor {
  porTramo: Record<TramoDePrescripcion, number>;
  totalCentavos: number;
  /** Lo que ya pasó el plazo (las notas de «5 o más» y las que llegaron a la fecha de posible prescripción). */
  posiblementePrescritoCentavos: number;
  posiblementePrescritas: number;
}

/** Suma por tramo, el total y lo posiblemente prescrito, aparte. */
export function totalesDeSaldosAFavor(filas: readonly SaldoAFavorClasificado[]): TotalesDeSaldosAFavor {
  const porTramo = Object.fromEntries(TRAMOS_DE_PRESCRIPCION.map((tramo) => [tramo, 0])) as Record<
    TramoDePrescripcion,
    number
  >;
  const prescritas = filas.filter(({ posiblementePrescrito }) => posiblementePrescrito);
  for (const fila of filas) porTramo[fila.tramo] += fila.saldoCentavos;
  return {
    porTramo,
    totalCentavos: filas.reduce((suma, { saldoCentavos }) => suma + saldoCentavos, 0),
    posiblementePrescritoCentavos: prescritas.reduce((suma, { saldoCentavos }) => suma + saldoCentavos, 0),
    posiblementePrescritas: prescritas.length,
  };
}
