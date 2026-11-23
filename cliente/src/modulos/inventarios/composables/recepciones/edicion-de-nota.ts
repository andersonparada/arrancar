import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { esCantidadPositiva, esMontoValido } from '../compartido/cantidades';
import type { Documento } from '../../servicios/documentos.api';
import type { DatosDeDevolucion, DatosDeRebaja, LineaPorRecibir } from '../../servicios/recepciones.api';

/** Lo que entró en una recepción de la factura y se puede devolver al proveedor. */
export interface EntradaDevolvible {
  movimientoId: string;
  articuloNombre: string;
  articuloCodigo: string;
  loteCodigo: string | null;
  bodegaNombre: string | null;
  fecha: string;
  /** Lo que entró, en la unidad base. */
  cantidad: string;
  unidadBaseNombre: string;
}

/** Una fila de la devolución: la entrada y cuánto de ella se devuelve (vacío = nada). */
export interface FilaDeDevolucion extends EntradaDevolvible {
  clave: number;
  devolver: string;
}

export interface EdicionDeDevolucion {
  abierta: boolean;
  /** «NC-5 · línea 1», para saber qué nota respalda la devolución. */
  nota: string;
  lineaId: string;
  fecha: string;
  observaciones: string;
  filas: FilaDeDevolucion[];
}

/** Las entradas de las recepciones vigentes de la factura que corrige la nota, de la más reciente a la más antigua. */
export function entradasDeLaFactura(recepciones: Documento[], facturaId: string | null): EntradaDevolvible[] {
  if (!facturaId) return [];
  return recepciones
    .filter((r) => r.estado === 'vigente' && r.documentoDeCompraId === facturaId)
    .flatMap((recepcion) =>
      recepcion.renglones.map((renglon) => ({
        movimientoId: renglon.movimientoId,
        articuloNombre: renglon.articuloNombre,
        articuloCodigo: renglon.articuloCodigo,
        loteCodigo: renglon.loteCodigo,
        bodegaNombre: recepcion.bodegaNombre,
        fecha: recepcion.fecha,
        cantidad: renglon.cantidad,
        unidadBaseNombre: renglon.unidadBaseNombre,
      })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

let siguienteClave = 1;

export const devolucionNueva = (
  nota: LineaPorRecibir,
  entradas: EntradaDevolvible[],
  hoy: string,
): EdicionDeDevolucion => ({
  abierta: true,
  nota: `${nota.documento} · línea ${nota.numeroDeLinea}`,
  lineaId: nota.lineaId,
  fecha: hoy,
  observaciones: '',
  filas: entradas.map((entrada) => ({ ...entrada, clave: siguienteClave++, devolver: '' })),
});

const filasConCantidad = (edicion: EdicionDeDevolucion) =>
  edicion.filas.filter((fila) => String(fila.devolver ?? '').trim() !== '');

export const datosDeDevolucion = (edicion: EdicionDeDevolucion): DatosDeDevolucion => ({
  fecha: edicion.fecha,
  lineaId: edicion.lineaId,
  observaciones: textoONulo(edicion.observaciones),
  renglones: filasConCantidad(edicion).map((fila) => ({
    movimientoDeEntradaId: fila.movimientoId,
    cantidad: String(fila.devolver).trim(),
    unidadId: null,
  })),
});

/** Lo que falta o está mal antes de enviar; el servidor decide lo demás (existencias, meses cerrados, PEPS). */
export function erroresDeDevolucion(edicion: EdicionDeDevolucion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la devolución.';
  const elegidas = filasConCantidad(edicion);
  if (!elegidas.length) errores.filas = 'Escriba la cantidad que devuelve en al menos una entrada.';
  edicion.filas.forEach((fila, indice) => {
    const devolver = String(fila.devolver ?? '').trim();
    if (!devolver) return;
    if (!esCantidadPositiva(devolver)) {
      errores[`filas.${indice}`] = 'Escriba una cantidad mayor que cero, con hasta 4 decimales.';
    } else if (Number(devolver) > Number(fila.cantidad)) {
      errores[`filas.${indice}`] = `No puede devolver más de lo que entró (${fila.cantidad} ${fila.unidadBaseNombre}).`;
    }
  });
  return errores;
}

export function resumenDeDevolucion(edicion: EdicionDeDevolucion): string {
  const n = filasConCantidad(edicion).length;
  return `Saldrá mercadería de ${n === 1 ? '1 entrada' : `${n} entradas`} al costo con que entró; el costo del resto no cambia. La nota ${edicion.nota} queda aplicada por esa devolución. Si el mes sigue abierto, podrá anularla con un motivo.`;
}

export interface EdicionDeRebaja {
  abierta: boolean;
  nota: string;
  lineaId: string;
  /** Lo que la nota todavía puede rebajar. */
  pendiente: string;
  fecha: string;
  monto: string;
  base: 'valor' | 'cantidad';
  observaciones: string;
}

export const rebajaNueva = (nota: LineaPorRecibir, hoy: string): EdicionDeRebaja => ({
  abierta: true,
  nota: `${nota.documento} · línea ${nota.numeroDeLinea}`,
  lineaId: nota.lineaId,
  pendiente: nota.pendiente,
  fecha: hoy,
  monto: nota.pendiente,
  base: 'valor',
  observaciones: '',
});

export const datosDeRebaja = (edicion: EdicionDeRebaja): DatosDeRebaja => ({
  fecha: edicion.fecha,
  lineaId: edicion.lineaId,
  monto: String(edicion.monto).trim(),
  base: edicion.base,
  observaciones: textoONulo(edicion.observaciones),
});

export function erroresDeRebaja(edicion: EdicionDeRebaja): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha de la rebaja.';
  const monto = String(edicion.monto ?? '').trim();
  const centavos = Math.round(Number(monto) * 100);
  if (!esMontoValido(monto) || centavos <= 0) {
    errores.monto = `Escriba el monto que rebaja la nota, mayor que cero y hasta ${formatearMonto(edicion.pendiente)}.`;
  } else if (centavos > Math.round(Number(edicion.pendiente) * 100)) {
    errores.monto = `La nota solo puede rebajar ${formatearMonto(edicion.pendiente)} más. Baje el monto.`;
  }
  return errores;
}

export const resumenDeRebaja = (edicion: EdicionDeRebaja): string => {
  const como = edicion.base === 'valor' ? 'según lo que costó cada entrada' : 'según la cantidad de cada entrada';
  return `Se rebajará ${formatearMonto(edicion.monto)} del costo de la mercadería de la factura, repartido ${como}. No mueve existencias: baja el valor del inventario y lo que ya salió va a resultados. Si el mes sigue abierto, podrá anularla con un motivo.`;
};

export const TEXTOS_DE_BASE: Record<EdicionDeRebaja['base'], { titulo: string; ayuda: string }> = {
  valor: { titulo: 'Según el valor', ayuda: 'Cada entrada recibe una parte proporcional a lo que costó.' },
  cantidad: { titulo: 'Según la cantidad', ayuda: 'Cada entrada recibe una parte proporcional a lo que entró.' },
};
