import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { RetencionDelMes } from '../../servicios/retenciones.api';
import { sumarMontos } from './dinero';

/** Una fila de la ventana de constancias: la retención y lo que el usuario escribe. */
export interface FilaDeConstancia {
  retencion: RetencionDelMes;
  numero: string;
  fecha: string;
}

/** Errores por posición de fila y luego por campo (`numero`, `fecha`). */
export type ErroresPorFila = Record<number, Record<string, string>>;

const CODIGO_DEL_LOTE = 'constancias_en_lote_invalidas';

/** Las filas para anotar; si la retención ya tiene constancia, sus datos vienen escritos (para corregirla). */
export const filasDeConstancias = (retenciones: readonly RetencionDelMes[]): FilaDeConstancia[] =>
  retenciones.map((retencion) => ({
    retencion,
    numero: retencion.constanciaNumero ?? '',
    fecha: retencion.constanciaFecha ?? '',
  }));

/** Copia la misma fecha a todas las filas. */
export const conFechaEnTodas = (filas: readonly FilaDeConstancia[], fecha: string): FilaDeConstancia[] =>
  filas.map((fila) => ({ ...fila, fecha }));

/** Revisa solo que no falte nada; las demás reglas (fecha, formato del número) las valida el servidor. */
export function revisarConstancias(filas: readonly FilaDeConstancia[]): ErroresPorFila {
  const errores: ErroresPorFila = {};
  filas.forEach((fila, indice) => {
    const deLaFila: Record<string, string> = {};
    if (!fila.numero.trim()) deLaFila.numero = 'Escriba el número de la constancia.';
    if (!fila.fecha) deLaFila.fecha = 'Escriba la fecha de la constancia.';
    if (Object.keys(deLaFila).length > 0) errores[indice] = deLaFila;
  });
  return errores;
}

/** Lo que se manda al servidor: el número sin espacios sobrantes. */
export const cuerpoDeConstancias = (filas: readonly FilaDeConstancia[]) =>
  filas.map(({ retencion, numero, fecha }) => ({ retencionId: retencion.id, numero: numero.trim(), fecha }));

interface FilaConProblema {
  indice: number;
  campo: string;
  mensaje: string;
}

function erroresDelLote(detalles: unknown): ErroresPorFila {
  const filas = (detalles as { filas?: FilaConProblema[] } | undefined)?.filas ?? [];
  const errores: ErroresPorFila = {};
  for (const { indice, campo, mensaje } of filas) {
    errores[indice] = { ...errores[indice], [campo]: mensaje };
  }
  return errores;
}

/**
 * Reparte el error del servidor entre las filas: el lote trae la fila y el campo de cada problema; una sola
 * constancia, el campo del error en la fila 0. `null` si el error no es de una fila (se avisa en general).
 */
export function erroresDeConstancias(error: unknown): ErroresPorFila | null {
  if (!(error instanceof ErrorApi)) return null;
  if (error.codigo === CODIGO_DEL_LOTE) return erroresDelLote(error.detalles);
  if (error.erroresCampos.length > 0) {
    return { 0: Object.fromEntries(error.erroresCampos.map((e) => [e.campo, e.mensaje])) };
  }
  return error.campoDelConflicto ? { 0: { [error.campoDelConflicto]: error.message } } : null;
}

/** Cuántas filas tienen problemas, para el resumen de arriba. */
export const filasConProblemas = (errores: ErroresPorFila): number => Object.keys(errores).length;

/** Cantidad y total retenido de las filas de la ventana. */
export const resumenDeConstancias = (filas: readonly FilaDeConstancia[]) => ({
  cantidad: filas.length,
  total: sumarMontos(filas.map((fila) => fila.retencion.retenido)),
});
