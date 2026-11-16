import { conceptoDe } from './concepto-del-estado.js';
import type {
  LineaDelEstado,
  MovimientoDelProveedor,
  PresentacionDelEstado,
  RetencionDelDocumento,
} from './estado-de-cuenta.tipos.js';

export * from './estado-de-cuenta.tipos.js';
export { conceptoDe };

/**
 * El estado de cuenta de un proveedor (R3, `docs/modulos/diseno-cp5-reportes.md`): ordena los hechos del rango, los reparte
 * en cargo y abono según la presentación y pone el saldo corrido. Los tipos están en `estado-de-cuenta.tipos.ts`.
 */

/** Cargo o abono de un movimiento tal cual, sin retenciones aparte. */
function lineaSimple(movimiento: MovimientoDelProveedor, montoCentavos = movimiento.montoCentavos): LineaDelEstado {
  const { fecha, hecho, documento, esCargo, anulado } = movimiento;
  return {
    fecha,
    hecho,
    documentoId: documento?.id ?? null,
    concepto: conceptoDe(movimiento),
    totalCentavos: null,
    retencionesCentavos: null,
    anterioresAlInicioCentavos: null,
    cargoCentavos: esCargo ? montoCentavos : 0,
    abonoCentavos: esCargo ? 0 : montoCentavos,
    saldoCentavos: null,
    anulada: anulado,
  };
}

/** En la presentación interna el documento va por su neto, con total y retenciones en sus columnas. */
function lineaInternaDelDocumento(movimiento: MovimientoDelProveedor): LineaDelEstado {
  const { detalle } = movimiento;
  if (!detalle) return lineaSimple(movimiento);
  return {
    ...lineaSimple(movimiento),
    totalCentavos: detalle.totalCentavos,
    retencionesCentavos: detalle.retencionesCentavos,
    anterioresAlInicioCentavos: detalle.anterioresAlInicioCentavos,
  };
}

const textoDeLaRetencion = ({ impuesto, constanciaNumero }: RetencionDelDocumento): string => {
  const deQue = impuesto ? ` de ${impuesto === 'iva' ? 'IVA' : 'ISR'}` : '';
  return `Retención${deQue}, ${constanciaNumero ? `constancia ${constanciaNumero}` : 'constancia pendiente'}`;
};

/** La retención como abono, con la misma fecha que el cargo por el total. */
function lineaDeRetencion(movimiento: MovimientoDelProveedor, retencion: RetencionDelDocumento): LineaDelEstado {
  return {
    ...lineaSimple(movimiento, retencion.montoCentavos),
    hecho: 'retencion',
    concepto: textoDeLaRetencion(retencion),
    cargoCentavos: 0,
    abonoCentavos: retencion.montoCentavos,
  };
}

/** Las retenciones del documento; si Libro de compras no las detalla todas, el resto va en una sin impuesto. */
function retencionesDelMovimiento(
  { documento, detalle }: MovimientoDelProveedor,
  retenciones: readonly RetencionDelDocumento[],
): RetencionDelDocumento[] {
  const propias = retenciones.filter(({ documentoId }) => documentoId === documento?.id);
  const sinDetallar = (detalle?.retencionesCentavos ?? 0) - propias.reduce((suma, r) => suma + r.montoCentavos, 0);
  if (sinDetallar <= 0 || !documento) return propias;
  return [
    ...propias,
    { documentoId: documento.id, impuesto: null, constanciaNumero: null, montoCentavos: sinDetallar },
  ];
}

/** Para el proveedor, el cargo va por el total y cada retención, debajo, como abono (lo que ve en su estado de cuenta). */
function lineasParaElProveedor(
  movimiento: MovimientoDelProveedor,
  retenciones: readonly RetencionDelDocumento[],
): LineaDelEstado[] {
  const { detalle } = movimiento;
  if (movimiento.hecho !== 'documento' || !detalle || detalle.esSaldoInicial || detalle.retencionesCentavos === 0) {
    return [lineaSimple(movimiento)];
  }
  return [
    lineaSimple(movimiento, detalle.totalCentavos),
    ...retencionesDelMovimiento(movimiento, retenciones).map((retencion) => lineaDeRetencion(movimiento, retencion)),
  ];
}

const porFechaYRegistro = (a: MovimientoDelProveedor, b: MovimientoDelProveedor): number =>
  a.fecha.localeCompare(b.fecha) || a.registradoEn.localeCompare(b.registradoEn);

/** Pone el saldo corrido en las líneas que suman, a partir del saldo anterior. */
function conSaldoCorrido(lineas: LineaDelEstado[], saldoAnteriorCentavos: number): LineaDelEstado[] {
  let saldo = saldoAnteriorCentavos;
  return lineas.map((linea) => {
    if (linea.anulada) return linea;
    saldo += linea.cargoCentavos - linea.abonoCentavos;
    return { ...linea, saldoCentavos: saldo };
  });
}

export interface EntradaDelEstado {
  movimientos: readonly MovimientoDelProveedor[];
  retenciones: readonly RetencionDelDocumento[];
  saldoAnteriorCentavos: number;
  presentacion: PresentacionDelEstado;
}

/** Las líneas del estado de cuenta, en orden de fecha y registro, con su saldo corrido. */
export function armarLineasDelEstado({
  movimientos,
  retenciones,
  saldoAnteriorCentavos,
  presentacion,
}: EntradaDelEstado): LineaDelEstado[] {
  const lineas = [...movimientos]
    .sort(porFechaYRegistro)
    .flatMap((movimiento) =>
      presentacion === 'interna'
        ? [lineaInternaDelDocumento(movimiento)]
        : lineasParaElProveedor(movimiento, retenciones),
    );
  return conSaldoCorrido(lineas, saldoAnteriorCentavos);
}

export interface TotalesDelEstado {
  saldoAnteriorCentavos: number;
  cargosCentavos: number;
  abonosCentavos: number;
  saldoFinalCentavos: number;
}

/** Cargos y abonos de las líneas que suman, y el saldo final (el saldo anterior más cargos menos abonos). */
export function totalesDelEstado(lineas: readonly LineaDelEstado[], saldoAnteriorCentavos: number): TotalesDelEstado {
  const suman = lineas.filter(({ anulada }) => !anulada);
  const cargosCentavos = suman.reduce((suma, linea) => suma + linea.cargoCentavos, 0);
  const abonosCentavos = suman.reduce((suma, linea) => suma + linea.abonoCentavos, 0);
  return {
    saldoAnteriorCentavos,
    cargosCentavos,
    abonosCentavos,
    saldoFinalCentavos: saldoAnteriorCentavos + cargosCentavos - abonosCentavos,
  };
}
