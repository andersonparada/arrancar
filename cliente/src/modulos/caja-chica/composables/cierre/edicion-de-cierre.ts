import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { CierreSolicitado } from '../../servicios/tipos-de-fondos';

/** Lo que se escribe al cerrar un fondo: por qué, cuándo y, si queda efectivo, a qué cuenta se deposita. */
export interface EdicionDeCierre {
  motivo: string;
  /** Vacía: la decide el servidor (hoy). */
  fecha: string;
  cuentaBancariaId: string | null;
  referencia: string;
}

/** La cuenta del depósito empieza siendo la cuenta del fondo, si la tiene. */
export const edicionDeCierre = (cuentaDelFondo: string | null): EdicionDeCierre => ({
  motivo: '',
  fecha: '',
  cuentaBancariaId: cuentaDelFondo,
  referencia: '',
});

/** Lo que falta antes de enviar: el motivo y, si el servidor espera efectivo en caja, la cuenta donde se deposita. */
export function faltaDelCierre(edicion: EdicionDeCierre, efectivoEsperado: string): Record<string, string> {
  const faltantes: Record<string, string> = {};
  if (!edicion.motivo.trim())
    faltantes.motivo = 'Escriba por qué se cierra el fondo: queda registrado en la auditoría.';
  if (Number(efectivoEsperado) > 0 && !edicion.cuentaBancariaId) {
    faltantes.cuentaBancariaId = 'Escoja la cuenta donde se deposita el efectivo que queda en el fondo.';
  }
  return faltantes;
}

export function cuerpoDeCierre(edicion: EdicionDeCierre): CierreSolicitado {
  return {
    motivo: edicion.motivo.trim(),
    ...(edicion.fecha.trim() ? { fecha: edicion.fecha.trim() } : {}),
    cuentaBancariaId: edicion.cuentaBancariaId,
    referencia: textoONulo(edicion.referencia),
  };
}
