import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { AjusteDelDocumento, AplicacionDelDocumento, FichaDelDocumento } from '../servicios/tipos';

const etiquetaDe = (serie: string | null, numero: string): string => (serie ? `${serie}-${numero}` : numero);

/** Lo que va a pasar al quitar una aplicación manual, para leerlo antes de confirmar. */
export function resumenDeQuitar(aplicacion: AplicacionDelDocumento): string {
  const nota = etiquetaDe(aplicacion.notaSerie, aplicacion.notaNumero);
  const cargo = etiquetaDe(aplicacion.cargoSerie, aplicacion.cargoNumero);
  return `Se quitarán ${formatearMonto(aplicacion.monto)} aplicados el ${formatearFecha(aplicacion.fecha)}: el documento ${cargo} volverá a deberlos y la nota ${nota} recuperará ese saldo a favor.`;
}

/**
 * En un cargo con aplicaciones manuales recibidas explica por qué no se anula ni se elimina; `null` si no aplica.
 * El servidor es quien rechaza la baja: esto solo avisa.
 */
export function avisoDeAplicacionesManuales(ficha: Pick<FichaDelDocumento, 'clase' | 'aplicaciones'>): string | null {
  if (ficha.clase !== 'cargo') return null;
  const notas = [
    ...new Set(
      ficha.aplicaciones
        .filter(({ forma }) => forma === 'manual')
        .map(({ notaSerie, notaNumero }) => etiquetaDe(notaSerie, notaNumero)),
    ),
  ];
  if (notas.length === 0) return null;
  const cuales = notas.length === 1 ? `la nota ${notas[0]}` : `las notas ${notas.join(', ')}`;
  return `Este documento recibió saldo a favor de ${cuales}. Para anularlo o eliminarlo, quite primero esas aplicaciones.`;
}

/** Lo que va a pasar al anular un ajuste. */
export const resumenDeAnularAjuste = (ajuste: AjusteDelDocumento): string =>
  `Se anulará el ajuste de ${formatearMonto(ajuste.monto)} del ${formatearFecha(ajuste.fecha)}: ese monto volverá al saldo a favor de la nota. El ajuste queda en la auditoría como anulado.`;
