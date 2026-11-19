import { deDiezmilesimas } from './decimales.js';
import { DevolucionMayorQueLaEntrada, NotaNoCorrespondeALasEntradas } from './errores-de-recepcion.js';
import { exigirNotaAplicable, type LineaDeCompra } from './linea-de-compra.js';
import {
  exigirRenglones,
  SIN_DESTINO,
  textoOpcional,
  type PlanDeDocumento,
  type RenglonDePlan,
} from './plan-de-documento.js';

/** Una entrada de una recepción vigente y lo que ya se le devolvió. */
export interface EntradaDevolvible {
  movimientoId: string;
  articuloId: string;
  bodegaId: string;
  loteId: string | null;
  /** El documento de recepción de Inventarios. */
  documentoId: string;
  /** La factura del libro que originó la recepción. */
  documentoDeCompraId: string;
  /** Diezmilésimas de la unidad base, mayor que cero. */
  cantidad: bigint;
  /** Σ de las devoluciones vigentes de esta entrada. */
  devuelta: bigint;
}

/** Un renglón devuelto: la entrada y la cantidad ya pasada a la unidad base. */
export interface RenglonDevuelto {
  entrada: EntradaDevolvible;
  renglon: RenglonDePlan;
}

export interface DevolucionEscrita {
  fecha: string;
  /** La línea de la nota de crédito que respalda la devolución. */
  nota: LineaDeCompra;
  observaciones: string | null;
  renglones: readonly RenglonDevuelto[];
}

/** Lo que se pide devolver de cada entrada, sumando los renglones que repiten la entrada. */
function devueltoPorEntrada(
  renglones: readonly RenglonDevuelto[],
): Map<string, { entrada: EntradaDevolvible; total: bigint }> {
  const totales = new Map<string, { entrada: EntradaDevolvible; total: bigint }>();
  for (const { entrada, renglon } of renglones) {
    const actual = totales.get(entrada.movimientoId) ?? { entrada, total: 0n };
    totales.set(entrada.movimientoId, { entrada, total: actual.total + renglon.cantidad });
  }
  return totales;
}

function exigirCantidades(renglones: readonly RenglonDevuelto[]): void {
  for (const { entrada, total } of devueltoPorEntrada(renglones).values()) {
    const disponible = entrada.cantidad - entrada.devuelta;
    if (total > disponible) throw new DevolucionMayorQueLaEntrada(deDiezmilesimas(disponible));
  }
}

function exigirCoherencia(nota: LineaDeCompra, renglones: readonly RenglonDevuelto[]): void {
  exigirNotaAplicable(nota);
  if (renglones.some(({ entrada }) => entrada.documentoDeCompraId !== nota.documentoAfectadoId))
    throw new NotaNoCorrespondeALasEntradas('La nota de crédito no corrige la factura de la que vienen las entradas.');
  if (new Set(renglones.map(({ entrada }) => entrada.bodegaId)).size > 1)
    throw new NotaNoCorrespondeALasEntradas('Una devolución sale de una sola bodega: haga una por bodega.');
}

/** La recepción que se devuelve, cuando todas las entradas son de la misma. */
function recepcionUnica(renglones: readonly RenglonDevuelto[]): string | null {
  const documentos = new Set(renglones.map(({ entrada }) => entrada.documentoId));
  return documentos.size === 1 ? [...documentos][0]! : null;
}

/**
 * Una devolución a proveedor (§6.3): sale de la bodega de las entradas que devuelve, a su costo (el motor lo
 * calcula; con PEPS, de su propia capa, §7.4). Se respalda con una línea de la nota de crédito de la factura.
 * @throws DocumentoInvalido si no hay renglones o alguna cantidad no es positiva.
 * @throws NotaNoCorrespondeALasEntradas si la nota no corrige la factura de las entradas o hay varias bodegas.
 * @throws DevolucionMayorQueLaEntrada si se pide más de lo que queda por devolver.
 */
export function planDeDevolucion(escrita: DevolucionEscrita): PlanDeDocumento {
  const { nota, renglones } = escrita;
  exigirRenglones(renglones.map(({ renglon }) => renglon));
  exigirCoherencia(nota, renglones);
  exigirCantidades(renglones);
  return {
    ...SIN_DESTINO,
    clase: 'devolucion_a_proveedor',
    fecha: escrita.fecha,
    bodegaId: renglones[0]!.entrada.bodegaId,
    documentoDeCompraId: nota.documentoId,
    documentoRelacionadoId: recepcionUnica(renglones),
    observaciones: textoOpcional(escrita.observaciones, 'Observaciones', 500),
    renglones: renglones.map(({ entrada, renglon }) => ({
      ...renglon,
      lineaDeCompraId: nota.lineaId,
      movimientoDeOrigenId: entrada.movimientoId,
    })),
    avisos: [],
  };
}
