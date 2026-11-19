/**
 * El texto cerrado con punto, sin duplicarlo cuando ya termina en uno («Eco S.A.» no pasa a «Eco S.A..»). Sirve para
 * cerrar una frase con un nombre que escribió el usuario.
 */
export const conPuntoFinal = (texto: string): string => (texto.trimEnd().endsWith('.') ? texto : `${texto}.`);
