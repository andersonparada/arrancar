import type { RegimenDeIva } from '../datos-fiscales-de-empresa.js';

/** Qué formulario de IVA corresponde al régimen y si declara compras. */
export type FormularioDelRegimen =
  | { formulario: 'SAT-2237'; declaraCompras: true; mensaje: null }
  | { formulario: 'SAT-2046'; declaraCompras: false; mensaje: string }
  | { formulario: null; declaraCompras: false; mensaje: string };

const MENSAJE_DEL_PEQUENO =
  'El pequeño contribuyente declara en el formulario SAT-2046, que no lleva compras: las compras no se declaran.';
const MENSAJE_SIN_FORMULARIO = 'Este régimen no tiene formulario de IVA con compras: no hay datos que declarar.';

/**
 * El SAT-2237 (IVA general) es del régimen general; el pequeño contribuyente usa el SAT-2046 y no declara compras;
 * los demás regímenes no tienen formulario.
 */
export function formularioDelRegimen(regimen: RegimenDeIva): FormularioDelRegimen {
  if (regimen === 'general') return { formulario: 'SAT-2237', declaraCompras: true, mensaje: null };
  if (regimen === 'pequeno_contribuyente' || regimen === 'pequeno_contribuyente_electronico') {
    return { formulario: 'SAT-2046', declaraCompras: false, mensaje: MENSAJE_DEL_PEQUENO };
  }
  return { formulario: null, declaraCompras: false, mensaje: MENSAJE_SIN_FORMULARIO };
}
