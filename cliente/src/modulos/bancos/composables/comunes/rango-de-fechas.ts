/** Un rango de fechas escrito en los filtros de un reporte (`AAAA-MM-DD`, ambas incluidas). */
export interface RangoDeFechas {
  desde: string;
  hasta: string;
}

const dosDigitos = (numero: number): string => String(numero).padStart(2, '0');

const aTexto = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

/** Del primer día del mes actual a hoy; `hoy` se puede fijar en las pruebas para no depender del reloj. */
export function rangoDelMesActual(hoy: Date = new Date()): RangoDeFechas {
  return { desde: aTexto(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aTexto(hoy) };
}

/** Un mensaje que dice cómo corregir si el rango no sirve (las dos fechas son obligatorias y en orden); si sirve, `undefined`. */
export function errorDeRango({ desde, hasta }: RangoDeFechas): string | undefined {
  if (!desde || !hasta) return 'Escribe la fecha inicial y la final.';
  if (desde > hasta) return 'La fecha inicial no puede ser posterior a la final.';
  return undefined;
}
