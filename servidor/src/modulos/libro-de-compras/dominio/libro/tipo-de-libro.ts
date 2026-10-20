import type { RegimenDeIva } from '../datos-fiscales-de-empresa.js';

/** Completo (con crédito fiscal) o simplificado (el IVA es informativo y va al costo). */
export type TipoDeLibro = 'completo' | 'simplificado';

/** Solo el régimen general acredita el IVA de sus compras: lleva el libro completo; los demás, el simplificado. */
export const tipoDeLibroDe = (regimen: RegimenDeIva): TipoDeLibro =>
  regimen === 'general' ? 'completo' : 'simplificado';
