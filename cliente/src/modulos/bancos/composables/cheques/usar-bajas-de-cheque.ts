import { apiCheques } from '../../servicios/cheques.api';
import type { ParteDeApertura } from '../../servicios/tipos-de-saldos-iniciales';
import { AYUDA_DE_FECHA_DE_APERTURA, esDeApertura, textoDeAnulacionDeApertura } from '../comunes/de-apertura';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';
import { usarCorteDeApertura } from '../comunes/usar-corte-de-apertura';
import { TEXTO_DE_ANULACION } from './textos-de-baja-de-cheque';

interface ChequeDeBaja {
  id: string;
  numero: number;
  moduloDeOrigen: string | null;
  parteDeApertura: ParteDeApertura | null;
}

/**
 * Las dos bajas de un cheque, de cualquiera de sus listas (por eso basta su `id`): anular (si su mes ya
 * está conciliado, o si es de la carga inicial, con una nota de crédito inversa con la fecha escrita) y blanquear
 * (vuelve a disponible y su movimiento se elimina). Los cheques no se eliminan. Un cheque de la carga inicial se
 * anula siempre con su inverso, y el texto de la ventana lo explica con la fecha de corte.
 */
export function usarBajasDeCheque<Cheque extends ChequeDeBaja>(alTerminar: () => Promise<void>) {
  const anulacion = usarBajaDeRegistro<Cheque>({
    ejecutar: (cheque, datos) => apiCheques.anular(cheque.id, datos),
    aviso: 'Cheque anulado.',
    alTerminar,
  });
  const blanqueo = usarBajaDeRegistro<Cheque>({
    ejecutar: (cheque, { motivo }) => apiCheques.blanquear(cheque.id, motivo),
    aviso: 'Cheque blanqueado: vuelve a estar disponible.',
    alTerminar,
  });
  const apertura = usarCorteDeApertura();

  /** Abre la ventana de anular; si el cheque es de la carga inicial, trae antes la fecha de corte. */
  function anular(cheque: Cheque): void {
    anulacion.abrir(cheque);
    if (esDeApertura(cheque)) void apertura.cargar();
  }

  /** El texto de la ventana de anular del cheque elegido. */
  function textoDeAnulacion(): string {
    const cheque = anulacion.registro;
    if (cheque && esDeApertura(cheque)) return textoDeAnulacionDeApertura(cheque.parteDeApertura, apertura.corte.value);
    return TEXTO_DE_ANULACION(cheque?.numero, cheque?.moduloDeOrigen);
  }

  /** La ayuda de la fecha: la de siempre, salvo en un cheque de la carga inicial. */
  const ayudaDeFecha = (): string | undefined =>
    anulacion.registro && esDeApertura(anulacion.registro) ? AYUDA_DE_FECHA_DE_APERTURA : undefined;

  return { anulacion, blanqueo, anular, textoDeAnulacion, ayudaDeFecha };
}
