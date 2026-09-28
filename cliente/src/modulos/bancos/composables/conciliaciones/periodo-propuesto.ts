export interface Periodo {
  anio: number;
  mes: number;
}

/**
 * El periodo que propone la ventana de "Nueva conciliación": el mes siguiente a
 * la última de la cuenta, o el mes anterior al actual si todavía no tiene ninguna.
 */
export function periodoPropuesto(ultima: Periodo | null, hoy: Date): Periodo {
  if (ultima) return ultima.mes === 12 ? { anio: ultima.anio + 1, mes: 1 } : { anio: ultima.anio, mes: ultima.mes + 1 };
  const mesActual = hoy.getMonth() + 1;
  return mesActual === 1 ? { anio: hoy.getFullYear() - 1, mes: 12 } : { anio: hoy.getFullYear(), mes: mesActual - 1 };
}
