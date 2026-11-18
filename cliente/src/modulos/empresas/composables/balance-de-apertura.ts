import { problemaDelDocumento, SOLO_PDF, type ReglasDeDocumento } from '@/modulos/core/utilidades/documentos';
import type { CargaInicial } from '../servicios/cierre-de-carga.tipos';

export const REGLAS_DEL_BALANCE: ReglasDeDocumento = {
  ...SOLO_PDF,
  mensajeDeTipo: 'Adjunte el balance en PDF; si lo tiene en papel, escanéelo como PDF.',
};

export const AYUDA_DEL_BALANCE = 'Solo PDF, hasta 10 MB. Es opcional: puede adjuntarlo también después de cerrar.';

/** Qué se puede hacer hoy con el balance de apertura firmado y, si algo no se puede, por qué. */
export interface AccionesDelBalance {
  puedeSubir: boolean;
  textoDeSubir: string;
  puedeQuitar: boolean;
  nota: string | null;
}

const sinAcciones = (nota: string): AccionesDelBalance => ({
  puedeSubir: false,
  textoDeSubir: '',
  puedeQuitar: false,
  nota,
});

/**
 * Abierta: se sube, reemplaza y quita. Cerrada: solo se sube si falta (el firmado suele llegar después); el que
 * respalda el cierre no cambia sin reabrir. Sin fecha de inicio guardada no hay carga a la que adjuntarlo.
 */
export function accionesDelBalance(carga: CargaInicial | null): AccionesDelBalance {
  const tiene = Boolean(carga?.balanceDeApertura);
  if (!carga?.fechaDeInicio) {
    return sinAcciones('Guarde primero la fecha de inicio para poder adjuntar el balance de apertura.');
  }
  if (carga.cerrada && tiene) {
    return sinAcciones('Con la carga cerrada el balance no se puede reemplazar ni quitar: reabra la carga primero.');
  }
  const textoDeSubir = tiene ? 'Reemplazar balance' : 'Adjuntar balance de apertura';
  return { puedeSubir: true, textoDeSubir, puedeQuitar: tiene && !carga.cerrada, nota: null };
}

/** Revisa el archivo elegido antes de subirlo; devuelve cómo corregirlo, o `null` si está bien. */
export const problemaDelBalance = (archivo: Pick<File, 'type' | 'size' | 'name'>): string | null =>
  problemaDelDocumento(archivo, REGLAS_DEL_BALANCE);
