/** Lo que se elige en los filtros de una lista o de un reporte: cuenta y rango de fechas. */
export interface FiltrosDeMovimientos {
  cuentaBancariaId: string | null;
  desde: string;
  hasta: string;
}

/** Lo que se manda al servidor como filtro de cuenta y fechas; lo usan notas, transferencias y el reporte. */
export interface FiltroConsultado {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  [clave: string]: string | undefined;
}

const dosDigitos = (numero: number): string => String(numero).padStart(2, '0');

const aTexto = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

/**
 * Los filtros al abrir la lista: del primer día del mes actual a hoy, y la
 * cuenta de la ruta (`?cuenta=`) si llegó una. `hoy` se puede fijar en las
 * pruebas para no depender del reloj.
 */
export function filtrosPorOmision(
  cuentaBancariaId: string | null = null,
  hoy: Date = new Date(),
): FiltrosDeMovimientos {
  const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { cuentaBancariaId, desde: aTexto(primerDiaDelMes), hasta: aTexto(hoy) };
}

/** Lo que se manda al servidor: solo lo que se eligió filtra. */
export function filtroDeLaConsulta(filtros: FiltrosDeMovimientos): FiltroConsultado {
  return {
    cuentaBancariaId: filtros.cuentaBancariaId ?? undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
  };
}
