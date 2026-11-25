import { CLASES_DE_FLUJO, NATURALEZAS, TIPOS_DE_CUENTA, TRATAMIENTOS_FISCALES } from '../textos';

/** Las opciones de una lista cerrada para un selector, ordenadas por nombre. */
function ordenadas<Valor extends string>(textos: Record<Valor, string>) {
  return (Object.entries(textos) as [Valor, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
}

export const OPCIONES_DE_NATURALEZA = ordenadas(NATURALEZAS);
export const OPCIONES_DE_TIPO = ordenadas(TIPOS_DE_CUENTA);
export const OPCIONES_DE_FLUJO = ordenadas(CLASES_DE_FLUJO);
export const OPCIONES_DE_TRATAMIENTO = ordenadas(TRATAMIENTOS_FISCALES);
