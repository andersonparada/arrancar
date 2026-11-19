import { CampoDelFormatoFaltante } from '../errores-de-impresion.js';
import type { CampoDeLeyenda } from './tipos.js';

export const TEXTO_NO_NEGOCIABLE = 'NO NEGOCIABLE';
export const TEXTO_PARA_ABONO_EN_CUENTA = 'PARA ABONO EN CUENTA';

/** Lo que dibuja una leyenda (si algo) y lo que avisa sin bloquear. */
export interface LeyendaArmada {
  dibujar: boolean;
  aviso: string | null;
}

/**
 * «NO NEGOCIABLE» (arts. 498 y 499, buena práctica): se dibuja solo si el cheque lo es y el formulario no lo trae
 * impreso. Si lo trae y el cheque se emitió negociable, avisa (sin bloquear) que no podrá negociarse.
 */
export function leyendaNoNegociable(campo: CampoDeLeyenda, noNegociable: boolean): LeyendaArmada {
  if (campo.preimpreso) {
    const aviso = noNegociable
      ? null
      : `Este formulario ya trae ${TEXTO_NO_NEGOCIABLE} impreso: el cheque no podrá negociarse aunque se haya emitido negociable.`;
    return { dibujar: false, aviso };
  }
  return { dibujar: noNegociable && campo.visible, aviso: null };
}

/**
 * «PARA ABONO EN CUENTA» (art. 521): la eligió quien emitió el cheque y no puede desaparecer en silencio.
 * @throws CampoDelFormatoFaltante si el cheque la lleva y el formato no tiene dónde ponerla.
 */
export function leyendaParaAbonoEnCuenta(campo: CampoDeLeyenda, paraAbonoEnCuenta: boolean): LeyendaArmada {
  if (campo.preimpreso) {
    const aviso = paraAbonoEnCuenta
      ? null
      : `Este formulario ya trae ${TEXTO_PARA_ABONO_EN_CUENTA} impreso: el cheque solo podrá abonarse en cuenta aunque no se haya emitido con esa condición.`;
    return { dibujar: false, aviso };
  }
  if (paraAbonoEnCuenta && !campo.visible) throw new CampoDelFormatoFaltante(TEXTO_PARA_ABONO_EN_CUENTA);
  return { dibujar: paraAbonoEnCuenta, aviso: null };
}
