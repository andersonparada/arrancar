import type { ActividadDelFlujo, ControlDeCuadre, LineaAparte } from '../../servicios/flujo-de-efectivo.api';

export const TITULOS_DE_ACTIVIDAD: Record<ActividadDelFlujo, string> = {
  operacion: 'Actividades de operación',
  inversion: 'Actividades de inversión',
  financiamiento: 'Actividades de financiamiento',
};

/** Un monto que resta (empieza con «-»): en pantalla se ve en rojo para que no pase desapercibido. */
export const esNegativo = (monto: string): boolean => monto.trim().startsWith('-');

/** El titular del control de cuadre. */
export const resumenDelCuadre = ({ cuadra }: Pick<ControlDeCuadre, 'cuadra'>): string =>
  cuadra ? 'El flujo cuadra con el saldo en libros.' : 'El flujo NO cuadra con el saldo en libros.';

/** Solo «Sin clasificar» lleva a la bandeja donde se corrige; y solo si tiene algo pendiente. */
export const debeLlevarALaBandeja = (linea: Pick<LineaAparte, 'clave' | 'cantidad'>): boolean =>
  linea.clave === 'sin_clasificar' && linea.cantidad > 0;
