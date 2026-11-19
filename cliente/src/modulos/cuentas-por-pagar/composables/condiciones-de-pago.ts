import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CondicionesDeProveedor, SaldoDelProveedor } from '../servicios/tipos';
import { avisoDeChequesDeAperturaSinLigar } from './cheques-de-apertura-sin-ligar';
import { detallesDeLoQueSeDebe, hayMontoPositivo } from './comprometido';

/** Lo que vale para un proveedor que nunca guardó sus condiciones. */
export const condicionesPorOmision = (): CondicionesDeProveedor => ({
  diasDeCredito: null,
  contarDesdeLaRecepcion: false,
});

/** Lo que se escribió en el campo de días: vacío es el plazo por omisión; lo demás lo valida el servidor. */
export function diasDesdeTexto(texto: string | number | null): number | null {
  if (texto === null || texto === '') return null;
  return Number(texto);
}

export const textoDeDias = (dias: number | null): string => (dias === null ? '' : String(dias));

/** El plazo por omisión de la empresa: «Un mes», «2 meses» o «De contado» (0 meses). */
export function textoDeMeses(meses: number): string {
  if (meses === 0) return 'De contado';
  return meses === 1 ? 'Un mes' : `${meses} meses`;
}

/**
 * El plazo como lo lee una persona: «30 días desde la emisión», «De contado» o, sin días propios, el plazo por
 * omisión real de la empresa («Un mes desde la emisión (plazo por omisión)»).
 */
export function textoDelPlazo(
  { diasDeCredito, contarDesdeLaRecepcion }: CondicionesDeProveedor,
  mesesPorOmision = 1,
): string {
  const desde = contarDesdeLaRecepcion ? 'la recepción' : 'la emisión';
  if (diasDeCredito === null) {
    if (mesesPorOmision === 0) return 'De contado (plazo por omisión)';
    return `${textoDeMeses(mesesPorOmision)} desde ${desde} (plazo por omisión)`;
  }
  if (diasDeCredito === 0) return 'De contado';
  return `${diasDeCredito} ${diasDeCredito === 1 ? 'día' : 'días'} desde ${desde}`;
}

/** Lo que dice el campo de días cuando está vacío: el plazo por omisión de la empresa. */
export const marcaDeDiasVacios = (meses: number | null): string =>
  meses === null ? 'Vacío = el plazo por omisión' : `Vacío = ${textoDeMeses(meses).toLowerCase()}`;

const hayMonto = hayMontoPositivo;

/** Los datos de la ficha del proveedor: el plazo y, si se puede ver, lo que se le debe con la empresa activa. */
export function detallesDeCondiciones(
  condiciones: CondicionesDeProveedor,
  saldo: SaldoDelProveedor | null,
  mesesPorOmision = 1,
): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Plazo de pago', valor: textoDelPlazo(condiciones, mesesPorOmision) },
  ];
  if (!saldo) return detalles;
  detalles.push(...detallesDeLoQueSeDebe(saldo));
  const sinLigar = avisoDeChequesDeAperturaSinLigar(saldo.chequesDeAperturaSinLigar);
  if (sinLigar) detalles.push({ etiqueta: 'Cheques de apertura', valor: sinLigar, largo: true });
  if (hayMonto(saldo.saldosDeudores)) {
    detalles.push({
      etiqueta: 'A favor de la empresa (notas de crédito)',
      valor: formatearMonto(saldo.saldosDeudores),
    });
  }
  return detalles;
}
