import type { FiltroDeSaldos } from '../../servicios/saldos-por-cuenta.api';

/** Lo que se elige arriba del reporte: la fecha de corte y una cuenta (o todas). */
export interface FiltrosDeSaldos {
  cuentaBancariaId: string | null;
  fecha: string;
}

const dosDigitos = (numero: number): string => String(numero).padStart(2, '0');

/** Al abrir: todas las cuentas, a hoy. `hoy` se puede fijar en las pruebas. */
export const filtrosPorOmision = (hoy: Date = new Date()): FiltrosDeSaldos => ({
  cuentaBancariaId: null,
  fecha: `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`,
});

/** Un mensaje que dice cómo corregir si falta la fecha de corte; si sirve, `undefined`. */
export const errorDeLaFecha = ({ fecha }: FiltrosDeSaldos): string | undefined =>
  fecha ? undefined : 'Escribe la fecha de corte.';

/** Lo que se manda al servidor. */
export const filtroDeLaConsulta = ({ fecha, cuentaBancariaId }: FiltrosDeSaldos): FiltroDeSaldos => ({
  fecha,
  cuentaBancariaId: cuentaBancariaId ?? undefined,
});
