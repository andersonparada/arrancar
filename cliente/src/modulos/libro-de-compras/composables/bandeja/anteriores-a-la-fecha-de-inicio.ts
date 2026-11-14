import type { DteRecibido, EstadoDeDte, FiltroDeAnteriores } from '../../servicios/dte-recibidos.api';
import { ANTERIORES_A_LA_FECHA_DE_INICIO as textos } from '../../textos-de-anteriores';

/** En Pendientes los DTE anteriores a la fecha de inicio van ocultos; en las demás pestañas se ven todos. */
export const anterioresPorOmision = (estado: EstadoDeDte): FiltroDeAnteriores =>
  estado === 'pendiente' ? 'ocultar' : 'incluir';

/** Las filas ya registradas no llevan la marca: están en el libro y no hay nada que revisar. */
const llevaLaMarca = (fila: DteRecibido): boolean => fila.anteriorALaFechaDeInicio && fila.estado !== 'registrado';

/** La etiqueta de una fila de antes de la fecha de inicio; `null` si no aplica. El tono destaca las que están en plazo de crédito. */
export function marcaDeAnterioridad(fila: DteRecibido): { texto: string; tono: 'trigo' | 'tierra' } | null {
  if (!llevaLaMarca(fila)) return null;
  return fila.enPlazoDeCredito
    ? { texto: textos.marcaEnPlazo, tono: 'trigo' }
    : { texto: textos.marca, tono: 'tierra' };
}

/** La frase que acompaña a una fila en plazo de crédito; vacía en las demás. */
export const avisoDeAnterioridad = (fila: DteRecibido): string =>
  llevaLaMarca(fila) && fila.enPlazoDeCredito ? textos.enPlazo : '';

/** «3 DTE son de antes de la fecha de inicio (15/03/2026) y no se muestran.» La fecha llega ya formateada. */
export function textoDeAnterioresOcultos(cantidad: number, fechaDeInicio: string): string {
  const quienes = cantidad === 1 ? '1 DTE es' : `${cantidad} DTE son`;
  return `${quienes} de antes de la fecha de inicio (${fechaDeInicio}) y no se ${cantidad === 1 ? 'muestra' : 'muestran'}.`;
}

/** El nombre completo del botón «Mostrar N», para quien usa lector de pantalla. */
export const nombreDeMostrarAnteriores = (cantidad: number): string =>
  `Mostrar los ${cantidad} DTE de antes de la fecha de inicio`;

/**
 * Qué aviso lleva la bandeja: `ocultas` (hay anteriores sin mostrar, con «Mostrar N»), `mostrando` (se ven en Pendientes,
 * con «Ocultar») o `ninguno`. Sin fecha de inicio nunca hay aviso.
 */
export function avisoDeLaBandeja(
  estado: EstadoDeDte,
  anteriores: FiltroDeAnteriores,
  datos: { fechaDeInicio: string | null; ocultos: number },
): 'ocultas' | 'mostrando' | 'ninguno' {
  if (datos.fechaDeInicio === null) return 'ninguno';
  if (datos.ocultos > 0) return 'ocultas';
  return estado === 'pendiente' && anteriores !== 'ocultar' ? 'mostrando' : 'ninguno';
}

/**
 * Conserva las marcas de anterioridad de la fila de la lista: las respuestas de completar, descartar y restaurar las
 * traen en falso porque solo la lista las calcula.
 */
export const conLasMarcasDeLaLista = (nueva: DteRecibido, anterior: DteRecibido | undefined): DteRecibido =>
  anterior
    ? {
        ...nueva,
        anteriorALaFechaDeInicio: anterior.anteriorALaFechaDeInicio,
        enPlazoDeCredito: anterior.enPlazoDeCredito,
      }
    : nueva;
