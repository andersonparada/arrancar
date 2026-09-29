import type { FiltroDeChequesCaducos } from '../../servicios/cheques-caducos.api';

/** Lo que se elige en los filtros; `meses` vacío significa «el plazo de la empresa». */
export interface FiltrosDeChequesCaducos {
  cuentaBancariaId: string | null;
  beneficiario: string;
  meses: string;
}

export const MESES_MINIMOS = 1;
export const MESES_MAXIMOS = 120;
export const MESES_POR_OMISION = 7;

export const filtrosPorOmision = (): FiltrosDeChequesCaducos => ({
  cuentaBancariaId: null,
  beneficiario: '',
  meses: '',
});

/** Los meses escritos, si son un entero dentro del rango que acepta el servidor; si no, `undefined`. */
export function mesesEscritos(texto: string): number | undefined {
  const meses = Number(texto.trim());
  const valido = texto.trim() !== '' && Number.isInteger(meses) && meses >= MESES_MINIMOS && meses <= MESES_MAXIMOS;
  return valido ? meses : undefined;
}

/** Un mensaje si lo escrito en meses no sirve (vacío sí sirve: usa el plazo de la empresa). */
export function errorDeMeses(texto: string): string | undefined {
  if (texto.trim() === '' || mesesEscritos(texto) !== undefined) return undefined;
  return `Escribe un número entero de meses entre ${MESES_MINIMOS} y ${MESES_MAXIMOS}, o déjalo vacío.`;
}

/** Lo que se manda al servidor: solo lo que se eligió y sirve filtra. */
export function filtroDeLaConsulta({
  cuentaBancariaId,
  beneficiario,
  meses,
}: FiltrosDeChequesCaducos): FiltroDeChequesCaducos {
  return {
    cuentaBancariaId: cuentaBancariaId ?? undefined,
    beneficiario: beneficiario.trim() || undefined,
    meses: mesesEscritos(meses),
  };
}
