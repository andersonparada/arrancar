/** Un aviso junto al campo de fecha: `atencion` (naranja) o `informacion` (azul). */
export interface AvisoDeFecha {
  nivel: 'atencion' | 'informacion';
  texto: string;
}

/** La fecha de hoy (`AAAA-MM-DD`) en la zona horaria dada; `ahora` se fija en las pruebas. */
export function fechaDeHoyEn(zonaHoraria: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/**
 * El aviso de una fecha posterior a hoy (se permite, pero se avisa). Los cheques
 * posfechados son normales: solo informan. Sin fecha o de hoy hacia atrás, `null`.
 */
export function avisoDeFechaFutura(fecha: string, hoy: string, esCheque = false): AvisoDeFecha | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha <= hoy) return null;
  return esCheque
    ? { nivel: 'informacion', texto: 'Cheque posfechado: la fecha es posterior a hoy.' }
    : { nivel: 'atencion', texto: 'La fecha es posterior a hoy. Revísala antes de guardar.' };
}
