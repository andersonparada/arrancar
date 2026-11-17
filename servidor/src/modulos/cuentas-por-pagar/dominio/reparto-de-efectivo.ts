import {
  DemasiadosDocumentosEnElReparto,
  DemasiadosPagosEnElReparto,
  FechaDePagoEnEfectivoInvalida,
  PagoMayorQueElRetiro,
  ProveedorRepetidoEnElReparto,
} from './errores-de-pagos-en-efectivo.js';
import { numeroDelRetiro, type RetiroDeEfectivo } from './retiros.js';

/** Un reparto lleva de 1 a 20 proveedores (un pago por proveedor). */
export const MAXIMO_DE_PAGOS_EN_REPARTO = 20;

/** Entre todos los pagos de un reparto, hasta 300 cargos. */
export const MAXIMO_DE_DOCUMENTOS_EN_REPARTO = 300;

/** Lo que el reparto necesita saber de cada pago antes de ir a la base. */
export interface PagoDelRepartoPedido {
  proveedorId: string;
  aplicaciones: readonly unknown[];
}

/**
 * De 1 a 20 pagos, cada proveedor una sola vez y hasta 300 cargos entre todos.
 * @throws DemasiadosPagosEnElReparto, ProveedorRepetidoEnElReparto, DemasiadosDocumentosEnElReparto
 */
export function exigirRepartoValido(pagos: readonly PagoDelRepartoPedido[]): void {
  if (pagos.length === 0 || pagos.length > MAXIMO_DE_PAGOS_EN_REPARTO) {
    throw new DemasiadosPagosEnElReparto(MAXIMO_DE_PAGOS_EN_REPARTO);
  }
  const vistos = new Set<string>();
  pagos.forEach(({ proveedorId }, indice) => {
    if (vistos.has(proveedorId)) throw new ProveedorRepetidoEnElReparto(indice);
    vistos.add(proveedorId);
  });
  const cargos = pagos.reduce((suma, { aplicaciones }) => suma + aplicaciones.length, 0);
  if (cargos > MAXIMO_DE_DOCUMENTOS_EN_REPARTO) {
    throw new DemasiadosDocumentosEnElReparto(MAXIMO_DE_DOCUMENTOS_EN_REPARTO);
  }
}

/**
 * Lo que se reparte cabe en lo que le queda al retiro.
 * @throws PagoMayorQueElRetiro
 */
export function exigirQueAlcanzaElRetiro(
  retiro: Pick<RetiroDeEfectivo, 'numero' | 'anioDeNumero'>,
  { disponibleCentavos, repartoCentavos }: { disponibleCentavos: number; repartoCentavos: number },
): void {
  if (repartoCentavos <= disponibleCentavos) return;
  const numero = numeroDelRetiro(retiro.numero, retiro.anioDeNumero);
  throw new PagoMayorQueElRetiro(numero, disponibleCentavos, repartoCentavos);
}

/**
 * La fecha de un pago en efectivo: hoy o pasada, sin preceder al retiro ni a la mínima de los documentos (emisión y fecha
 * de inicio).
 * @throws FechaDePagoEnEfectivoInvalida
 */
export function exigirFechaDelPagoEnEfectivo(
  fecha: string,
  { minima, fechaDelRetiro, hoy }: { minima: string; fechaDelRetiro: string; hoy: string },
): void {
  const desde = fechaDelRetiro > minima ? fechaDelRetiro : minima;
  if (fecha < desde || fecha > hoy) throw new FechaDePagoEnEfectivoInvalida(desde);
}
