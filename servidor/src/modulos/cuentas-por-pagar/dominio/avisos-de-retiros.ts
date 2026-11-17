import { quetzales } from './avisos.js';
import { numeroDelRetiro, type RetiroDeEfectivo } from './retiros.js';

/** El aviso de fin de mes: un retiro abierto de un mes anterior tiene efectivo a cargo del custodio. */
export function avisoDeRetiroDeMesAnterior(
  retiro: Pick<RetiroDeEfectivo, 'numero' | 'anioDeNumero' | 'fecha' | 'custodio'>,
  disponibleCentavos: number,
): string {
  const [anio, mes] = retiro.fecha.split('-');
  const numero = numeroDelRetiro(retiro.numero, retiro.anioDeNumero);
  return `El retiro ${numero} es de ${mes}/${anio} y aún tiene ${quetzales(disponibleCentavos)} sin usar: liquídelo o úselo; ese efectivo es de la empresa y está a cargo de ${retiro.custodio}.`;
}

/** Quien liquida es el custodio: conviene que lo liquide otra persona. */
export const AVISO_DEL_CUSTODIO_QUE_LIQUIDA =
  'Usted es el custodio de este retiro: conviene que lo liquide otra persona.';

/**
 * El aviso al sacar efectivo para pagar proveedores: si a un mismo proveedor se le paga en efectivo y lo pagado en el mes llega
 * al umbral, ese pago no respalda lo que la empresa pierde según su régimen. `null` si el retiro no llega al umbral o la empresa
 * no pierde nada (o no tiene datos fiscales para saberlo).
 */
export function avisoDelRetiroEnEfectivo(
  retiro: { montoCentavos: number; umbralCentavos: number },
  efecto: { iva: boolean; isr: boolean } | null,
): string | null {
  if (efecto === null || (!efecto.iva && !efecto.isr) || retiro.montoCentavos < retiro.umbralCentavos) return null;
  const pierde = [efecto.isr ? 'el costo para el ISR' : null, efecto.iva ? 'el crédito fiscal del IVA' : null]
    .filter(Boolean)
    .join(' y ');
  return `Va a sacar ${quetzales(retiro.montoCentavos)} en efectivo para pagar proveedores. Si a un mismo proveedor le paga en efectivo y lo pagado en el mes llega a ${quetzales(retiro.umbralCentavos)}, ese pago no respalda ${pierde} (Decreto 20-2006, art. 20).`;
}
