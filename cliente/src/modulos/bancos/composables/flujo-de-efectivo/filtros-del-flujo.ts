import type { FiltroDelFlujo } from '../../servicios/flujo-de-efectivo.api';
import { rangoDelMesActual } from '../comunes/rango-de-fechas';

/** Lo que se elige en los filtros del flujo: cuenta (o todas) y rango de fechas. */
export interface FiltrosDelFlujo {
  cuentaBancariaId: string | null;
  desde: string;
  hasta: string;
}

/** Al abrir: todas las cuentas, del primer día del mes a hoy. */
export const filtrosPorOmision = (hoy: Date = new Date()): FiltrosDelFlujo => ({
  cuentaBancariaId: null,
  ...rangoDelMesActual(hoy),
});

/** Lo que se manda al servidor: solo la cuenta es opcional. */
export const filtroDeLaConsulta = ({ cuentaBancariaId, desde, hasta }: FiltrosDelFlujo): FiltroDelFlujo => ({
  cuentaBancariaId: cuentaBancariaId ?? undefined,
  desde,
  hasta,
});
