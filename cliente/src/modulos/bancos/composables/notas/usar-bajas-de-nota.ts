import { apiNotas } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { AYUDA_DE_FECHA_DE_APERTURA, esDeApertura, textoDeAnulacionDeApertura } from '../comunes/de-apertura';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';
import { usarCorteDeApertura } from '../comunes/usar-corte-de-apertura';

const textoNormal = (referencia: string | null | undefined): string =>
  `Se creará el movimiento inverso de la nota${referencia ? ` «${referencia}»` : ''}; nada se borra.`;

/**
 * Las dos bajas de una nota: anular (crea su movimiento inverso, con la fecha que se escriba) y
 * eliminar (solo si está limpia). La tarjeta muestra cada botón solo si el servidor dice que se puede.
 * Una nota de la carga inicial se anula siempre con su inverso, con fecha posterior al corte: la ventana lo explica.
 */
export function usarBajasDeNota(alTerminar: () => Promise<void>) {
  const anulacion = usarBajaDeRegistro<Movimiento>({
    ejecutar: (nota, datos) => apiNotas.anular(nota.id, datos),
    aviso: 'Nota anulada: se creó su movimiento inverso.',
    alTerminar,
  });
  const eliminacion = usarBajaDeRegistro<Movimiento>({
    ejecutar: (nota, { motivo }) => apiNotas.eliminar(nota.id, motivo),
    aviso: 'Nota eliminada.',
    alTerminar,
  });
  const apertura = usarCorteDeApertura();

  /** Abre la ventana de anular; si la nota es de la carga inicial, trae antes la fecha de corte. */
  function anular(nota: Movimiento): void {
    anulacion.abrir(nota);
    if (esDeApertura(nota)) void apertura.cargar();
  }

  /** El texto de la ventana de anular de la nota elegida. */
  function textoDeAnulacion(): string {
    const nota = anulacion.registro;
    if (nota && esDeApertura(nota)) return textoDeAnulacionDeApertura(nota.parteDeApertura, apertura.corte.value);
    return textoNormal(nota?.referencia);
  }

  const ayudaDeFecha = (): string | undefined =>
    anulacion.registro && esDeApertura(anulacion.registro) ? AYUDA_DE_FECHA_DE_APERTURA : undefined;

  return { anulacion, eliminacion, anular, textoDeAnulacion, ayudaDeFecha };
}
