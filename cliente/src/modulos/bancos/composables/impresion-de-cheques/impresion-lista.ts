import type { VistaDeImpresion } from '../../servicios/tipos-de-impresion-de-cheques';

/**
 * Una reimpresión ya registrada que espera en la pantalla de impresión. Reimprimir pide el motivo y registra al
 * responder; la respuesta es lo único que se imprime, así que pasa de la ventana a la pantalla de impresión por aquí
 * (en memoria): si el usuario recarga la página se pierde, y la pantalla no vuelve a imprimir sin motivo.
 */
let lista: VistaDeImpresion | null = null;

/** Deja la impresión ya registrada para que la tome la pantalla de impresión. */
export function dejarImpresionLista(vista: VistaDeImpresion): void {
  lista = vista;
}

/** La impresión que esperaba, si es de esos cheques; solo se entrega una vez. */
export function tomarImpresionLista(ids: readonly string[]): VistaDeImpresion | null {
  const vista = lista;
  lista = null;
  if (!vista) return null;
  const mismos = vista.cheques.length === ids.length && vista.cheques.every((c) => ids.includes(c.chequeId));
  return mismos ? vista : null;
}
