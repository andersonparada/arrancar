import type { DatosDeReimpresion } from '../../servicios/tipos-de-impresion-de-cheques';

/** Lo que muestra la ventana de reimprimir: el cheque, el motivo (obligatorio) y si se vuelve a imprimir el cheque. */
export interface EdicionDeReimpresion {
  abierta: boolean;
  chequeId: string | null;
  titulo: string;
  motivo: string;
  /** Falso por omisión: solo el comprobante (otra copia, o el formulario sigue en blanco y solo falta el voucher). */
  conCheque: boolean;
}

export const MAXIMO_DEL_MOTIVO = 300;

export const reimpresionCerrada = (): EdicionDeReimpresion => ({
  abierta: false,
  chequeId: null,
  titulo: '',
  motivo: '',
  conCheque: false,
});

/** La ventana abierta para ese cheque, sin motivo y con «Solo el comprobante». */
export const reimpresionNueva = (chequeId: string, titulo: string): EdicionDeReimpresion => ({
  abierta: true,
  chequeId,
  titulo,
  motivo: '',
  conCheque: false,
});

/** Lo que se manda: el motivo sin espacios sobrantes y qué se reimprime. */
export const datosDeReimpresion = (edicion: EdicionDeReimpresion): DatosDeReimpresion => ({
  motivo: edicion.motivo.trim(),
  conCheque: edicion.conCheque,
});

/** Por qué todavía no se puede confirmar, dicho como se corrige; `null` si ya se puede. */
export function problemaDelMotivo(motivo: string): string | null {
  const limpio = motivo.trim();
  if (!limpio) return 'Escriba el motivo de la reimpresión: queda en la auditoría.';
  if (limpio.length > MAXIMO_DEL_MOTIVO)
    return `El motivo admite hasta ${MAXIMO_DEL_MOTIVO} caracteres; sobran ${limpio.length - MAXIMO_DEL_MOTIVO}.`;
  return null;
}

/** El resumen de lo que va a pasar al confirmar, para que el operador no se equivoque de papel. */
export function resumenDeLaReimpresion(edicion: Pick<EdicionDeReimpresion, 'titulo' | 'conCheque'>): string {
  return edicion.conCheque
    ? `Se volverá a imprimir el ${edicion.titulo} y su comprobante (marcado «REIMPRESIÓN»). Ponga un formulario en blanco en la impresora: el anterior no sirve para otro cheque.`
    : `Solo se imprimirá otra copia del comprobante del ${edicion.titulo}, marcada «REIMPRESIÓN». El cheque no se toca.`;
}
