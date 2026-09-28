import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosChequera } from '../../servicios/chequeras.api';

/**
 * Lo que muestra cada campo de la ventana mientras se crea una chequera.
 * `cuentaBancariaId` solo se pide en la pantalla de administración, que junta
 * las chequeras de toda la empresa: desde la ficha de la cuenta ya se sabe.
 */
export interface EdicionDeChequera {
  abierta: boolean;
  cuentaBancariaId: string | null;
  serie: string;
  desde: string | number;
  hasta: string | number;
}

/** La ventana recién abierta, vacía. */
export function edicionDeChequera(): EdicionDeChequera {
  return { abierta: true, cuentaBancariaId: null, serie: '', desde: '', hasta: '' };
}

/** Lo que se manda al servidor: la serie vacía como `null` y los números como números. */
export const datosDeChequera = (edicion: EdicionDeChequera): DatosChequera => ({
  serie: textoONulo(edicion.serie),
  desde: Number(edicion.desde),
  hasta: Number(edicion.hasta),
});
