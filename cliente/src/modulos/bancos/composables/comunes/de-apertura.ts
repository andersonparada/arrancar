import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { textoDeAnulacionDeCheque, textoDeAnulacionDeDeposito, textoDeAnulacionDeOtra } from '../../textos-de-apertura';
import type { ParteDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

/** La insignia de todo lo que nació en la carga inicial (docs/modulos/diseno-bancos-segunda-parte.md §9.2). */
export const INSIGNIA_DE_APERTURA = 'Carga inicial';

/** Cómo se llama el corte mientras no se sabe su fecha (el usuario puede no ver los saldos iniciales). */
const CORTE_SIN_FECHA = 'corte de la carga inicial';

export const AYUDA_DE_FECHA_DE_APERTURA =
  'Fecha del movimiento inverso: debe ser posterior al corte de la carga inicial y no puede caer en un mes conciliado.';

/** Si el registro es una partida de la carga inicial (el servidor manda su parte; nulo si no lo es). */
export const esDeApertura = (registro: { parteDeApertura: ParteDeApertura | null }): boolean =>
  registro.parteDeApertura !== null;

/** El dato «Origen: Carga inicial» de la tarjeta; `null` si el registro no es de la carga inicial. */
export const detalleDeApertura = (registro: { parteDeApertura: ParteDeApertura | null }): DetalleDeRegistro | null =>
  esDeApertura(registro) ? { etiqueta: 'Origen', valor: INSIGNIA_DE_APERTURA } : null;

/** La insignia que pide el estado del registro; si no tiene estado propio, la de la carga inicial. */
export const insigniaConApertura = (
  registro: { parteDeApertura: ParteDeApertura | null },
  propia: string | undefined,
): string | undefined => propia ?? (esDeApertura(registro) ? INSIGNIA_DE_APERTURA : undefined);

/**
 * Lo que explica la ventana al anular una partida de la carga inicial: se crea siempre el movimiento inverso, con
 * fecha posterior al corte. `corte` ya viene formateado; sin él se nombra el corte sin la fecha.
 */
export function textoDeAnulacionDeApertura(parte: ParteDeApertura | null, corte: string | null): string {
  const fecha = corte ?? CORTE_SIN_FECHA;
  if (parte === 'deposito_en_transito') return textoDeAnulacionDeDeposito(fecha);
  if (parte === 'cheque_en_circulacion' || parte === 'cheque_posfechado') return textoDeAnulacionDeCheque(fecha);
  return textoDeAnulacionDeOtra(fecha);
}
