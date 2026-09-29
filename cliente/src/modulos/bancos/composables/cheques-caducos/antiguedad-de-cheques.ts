/** Qué tan urgente es un cheque por su antigüedad: pasó el plazo, o ya lleva más de un año sin cobrarse. */
export type NivelDeAntiguedad = 'vencido' | 'muy-vencido';

const DIAS_DE_UN_ANIO = 365;
const DIAS_PROMEDIO_DE_UN_MES = 30.4375;

export const nivelDeAntiguedad = (dias: number): NivelDeAntiguedad =>
  dias > DIAS_DE_UN_ANIO ? 'muy-vencido' : 'vencido';

/** Los meses completos que caben en esos días. */
export const mesesCompletos = (dias: number): number => Math.floor(dias / DIAS_PROMEDIO_DE_UN_MES);

/** «271 días» y, debajo, «8 meses»: lo primero es exacto y lo segundo ayuda a leerlo. */
export function textoDeAntiguedad(dias: number): { dias: string; meses: string } {
  const meses = mesesCompletos(dias);
  return {
    dias: dias === 1 ? '1 día' : `${dias} días`,
    meses: meses === 1 ? '1 mes' : `${meses} meses`,
  };
}

/** El número de cheque con su serie, si la chequera la tiene: `A-1042`. */
export const numeroDeChequeConSerie = ({ serie, numero }: { serie: string | null; numero: number }): string =>
  serie ? `${serie}-${numero}` : String(numero);

export const TEXTO_DEL_ORIGEN = { cuentas_por_pagar: 'Cuentas por pagar', suelto: 'Suelto' } as const;
