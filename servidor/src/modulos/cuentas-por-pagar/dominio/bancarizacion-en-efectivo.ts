import { quetzales } from './avisos.js';
import { mesLegible, type EfectoFiscal } from './bancarizacion-de-pagos.js';

/** Un cargo del pago con lo que importa para la bancarización. */
export interface CargoDelPagoEnEfectivo {
  /** Serie y número del documento, como se lee. */
  etiqueta: string;
  totalCentavos: number;
  /** Lo que perdería la empresa por este cargo; `null` si no hay datos fiscales para saberlo. */
  efecto: EfectoFiscal | null;
  esSaldoInicial: boolean;
}

export interface EntradaDeBancarizacionEnEfectivo {
  proveedorNombre: string;
  /** `AAAA-MM-DD`: la fecha del pago, que fija el mes calendario. */
  fecha: string;
  umbralCentavos: number;
  /** Lo que este pago entrega a los cargos, antes de retenciones. */
  montoDelPagoCentavos: number;
  /** Lo ya pagado al proveedor en el mes con cualquier forma (cheques, notas, notas ligadas y efectivo vigentes). */
  pagadoEnElMesCentavos: number;
  cargos: readonly CargoDelPagoEnEfectivo[];
}

/**
 * Qué pasa con el pago según la bancarización: nada, un aviso (no hay datos fiscales para saber si la empresa pierde algo)
 * o un bloqueo con su texto (la empresa pierde costo o crédito fiscal y el pago llegó al umbral).
 */
export type ResultadoDeBancarizacion =
  { tipo: 'libre' } | { tipo: 'avisar'; mensaje: string } | { tipo: 'bloquear'; mensaje: string };

export const AVISO_DE_DATOS_FISCALES_EN_EFECTIVO =
  'Complete los datos fiscales de la empresa en Libro de compras para saber si este pago en efectivo afecta el costo o el crédito fiscal.';

const LIBRE: ResultadoDeBancarizacion = { tipo: 'libre' };

/** El efecto del pago: la unión de lo que pierde cada cargo; `null` si alguno no tiene datos fiscales para saberlo. */
export function efectoDelPagoEnEfectivo(
  cargos: readonly Pick<CargoDelPagoEnEfectivo, 'efecto'>[],
): EfectoFiscal | null {
  if (cargos.some(({ efecto }) => efecto === null)) return null;
  const efectos = cargos.map(({ efecto }) => efecto!);
  return { iva: efectos.some(({ iva }) => iva), isr: efectos.some(({ isr }) => isr) };
}

/** Por qué se dispara: el mes del proveedor llega al umbral o un cargo de ese monto se paga por partes. */
function porQueSeDispara(entrada: EntradaDeBancarizacionEnEfectivo): string | null {
  const suma = entrada.pagadoEnElMesCentavos + entrada.montoDelPagoCentavos;
  if (suma >= entrada.umbralCentavos) {
    return `lo pagado a ${entrada.proveedorNombre} en ${mesLegible(entrada.fecha)} llega a ${quetzales(suma)}`;
  }
  const grande = entrada.cargos.find(({ totalCentavos }) => totalCentavos >= entrada.umbralCentavos);
  if (!grande) return null;
  return `el documento ${grande.etiqueta} es de ${quetzales(entrada.umbralCentavos)} o más`;
}

/** Lo que pierde la empresa, solo lo que aplica: el costo para el ISR y/o el crédito fiscal del IVA, con la rectificación. */
function loQuePierde(entrada: EntradaDeBancarizacionEnEfectivo, efecto: EfectoFiscal): string {
  const partes: string[] = [];
  if (efecto.isr) partes.push('ese costo no es deducible del ISR');
  if (efecto.iva) {
    const facturas = entrada.cargos
      .filter(({ efecto: delCargo }) => delCargo?.iva)
      .map(({ etiqueta }) => etiqueta)
      .join(', ');
    const sinSaber = entrada.cargos.some(({ esSaldoInicial, efecto: delCargo }) => esSaldoInicial && delCargo?.iva);
    const condicion = sinSaber ? 'si tomó el crédito fiscal, ' : '';
    partes.push(
      `${condicion}el IVA de ${facturas} no es crédito fiscal; si ya lo tomó, rectifique la declaración de ese mes (Código Tributario, art. 106)`,
    );
  }
  return partes.join(' y ');
}

function textoDelBloqueo(entrada: EntradaDeBancarizacionEnEfectivo, motivoDelDisparo: string, efecto: EfectoFiscal) {
  const tope = quetzales(entrada.umbralCentavos);
  return (
    `Bancarización (Decreto 20-2006, art. 20): ${motivoDelDisparo}. Los pagos de ${tope} o más a un mismo proveedor en el mes, ` +
    `o de una operación de ese monto aunque se pague por partes, deben hacerse por cheque, transferencia o tarjeta a nombre del proveedor. ` +
    `Si paga en efectivo, ${loQuePierde(entrada, efecto)}. Arrancar solo suma los pagos registrados en Cuentas por pagar.`
  );
}

/**
 * La bancarización de un pago en efectivo (Decreto 20-2006, art. 20; diseño de la adenda §5.2 y §5.3). Se dispara si un cargo
 * del pago es del umbral o más o si lo pagado al proveedor en el mes, con este pago, llega al umbral. Disparado: sin datos
 * fiscales solo avisa; si la empresa no pierde nada según su régimen no pasa nada; si pierde algo, bloquea.
 */
export function evaluarBancarizacionEnEfectivo(entrada: EntradaDeBancarizacionEnEfectivo): ResultadoDeBancarizacion {
  const motivoDelDisparo = porQueSeDispara(entrada);
  if (motivoDelDisparo === null) return LIBRE;
  const efecto = efectoDelPagoEnEfectivo(entrada.cargos);
  if (efecto === null) return { tipo: 'avisar', mensaje: AVISO_DE_DATOS_FISCALES_EN_EFECTIVO };
  if (!efecto.iva && !efecto.isr) return LIBRE;
  return { tipo: 'bloquear', mensaje: textoDelBloqueo(entrada, motivoDelDisparo, efecto) };
}
