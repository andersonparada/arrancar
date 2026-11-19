import { DocumentoInvalido } from './errores-de-kardex.js';
import { exigirCapacidadDeLinea, exigirRecibible, type LineaDeCompra } from './linea-de-compra.js';
import {
  exigirRenglones,
  SIN_DESTINO,
  textoOpcional,
  type PlanDeDocumento,
  type RenglonDePlan,
} from './plan-de-documento.js';

/** Un renglón recibido: la línea del libro de la que viene y lo que entra a la bodega (su costo es el monto). */
export interface RenglonRecibido {
  linea: LineaDeCompra;
  renglon: RenglonDePlan;
}

export interface RecepcionEscrita {
  fecha: string;
  bodegaId: string;
  observaciones: string | null;
  renglones: readonly RenglonRecibido[];
}

/** Días de diferencia que se toleran entre la emisión de la factura y la llegada de la mercadería sin avisar. */
export const DIAS_DE_AVISO_POR_FECHA = 30;

const MILISEGUNDOS_POR_DIA = 86_400_000;

const diasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MILISEGUNDOS_POR_DIA);

/** La mercadería pudo llegar antes que la factura, pero una diferencia grande merece una revisión (§6.3). */
function avisoDeFecha(documento: string, emision: string, fecha: string): string[] {
  if (diasEntre(fecha, emision) <= DIAS_DE_AVISO_POR_FECHA) return [];
  return [
    `La recepción es más de ${DIAS_DE_AVISO_POR_FECHA} días anterior a la emisión de ${documento}: revise la fecha.`,
  ];
}

/** Los montos nuevos por línea, para revisar su capacidad con todos los renglones de la misma línea juntos. */
function montosPorLinea(renglones: readonly RenglonRecibido[]): Map<string, { linea: LineaDeCompra; monto: bigint }> {
  const montos = new Map<string, { linea: LineaDeCompra; monto: bigint }>();
  for (const { linea, renglon } of renglones) {
    const actual = montos.get(linea.lineaId) ?? { linea, monto: 0n };
    montos.set(linea.lineaId, { linea, monto: actual.monto + renglon.costoTotal });
  }
  return montos;
}

/**
 * Revisa lo que se recibe contra el libro: cada línea es recibible y la suma de lo recibido (lo anterior más esto) no
 * pasa de su costo.
 * @throws LineaNoRecibible, LineaDescartada o LineaSobrerrecibida según la línea.
 */
export function exigirRecepcionesValidas(renglones: readonly RenglonRecibido[]): void {
  for (const { linea, monto } of montosPorLinea(renglones).values()) {
    exigirRecibible(linea);
    exigirCapacidadDeLinea(linea, monto);
  }
}

function planDelDocumento(escrita: RecepcionEscrita, renglones: readonly RenglonRecibido[]): PlanDeDocumento {
  const { linea } = renglones[0]!;
  const planes = renglones.map(({ linea: deLaLinea, renglon }) => ({ ...renglon, lineaDeCompraId: deLaLinea.lineaId }));
  return {
    clase: 'recepcion_de_compra',
    fecha: escrita.fecha,
    bodegaId: escrita.bodegaId,
    documentoDeCompraId: linea.documentoId,
    ...SIN_DESTINO,
    observaciones: textoOpcional(escrita.observaciones, 'Observaciones', 500),
    renglones: planes,
    avisos: avisoDeFecha(linea.documento, linea.fechaEmision, escrita.fecha),
  };
}

/**
 * Los documentos de una recepción (§6.3): uno por documento del libro, todos en la misma bodega y fecha. Cada renglón
 * lleva su línea y su monto (el costo de la entrada); el costo es el que dice el libro, no el que se calcule aquí.
 * @throws DocumentoInvalido si no hay renglones o algún monto o cantidad no es positivo.
 * @throws LineaNoRecibible, LineaDescartada, LineaSobrerrecibida si el libro no lo permite.
 */
export function planesDeRecepcion(escrita: RecepcionEscrita): PlanDeDocumento[] {
  const renglones = escrita.renglones.map(({ renglon }) => renglon);
  exigirRenglones(renglones);
  if (renglones.some((renglon) => renglon.costoTotal <= 0n))
    throw new DocumentoInvalido('El monto de cada renglón debe ser mayor que cero.');
  exigirRecepcionesValidas(escrita.renglones);
  const porDocumento = new Map<string, RenglonRecibido[]>();
  for (const recibido of escrita.renglones) {
    const lista = porDocumento.get(recibido.linea.documentoId) ?? [];
    lista.push(recibido);
    porDocumento.set(recibido.linea.documentoId, lista);
  }
  return [...porDocumento.values()].map((grupo) => planDelDocumento(escrita, grupo));
}
