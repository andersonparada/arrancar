import type { DatosDeBaja } from '../../servicios/datos-de-baja';

const conDosCifras = (numero: number): string => String(numero).padStart(2, '0');

/** La fecha de hoy como `AAAA-MM-DD`, en la zona del usuario: la fecha que se propone para el movimiento inverso. */
export function fechaDeHoy(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${conDosCifras(ahora.getMonth() + 1)}-${conDosCifras(ahora.getDate())}`;
}

/** Lo que muestra la ventana al abrirse: sin motivo y con la fecha de hoy. */
export const datosDeBajaNuevos = (ahora?: Date): DatosDeBaja => ({ motivo: '', fecha: fechaDeHoy(ahora) });
