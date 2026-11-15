import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import { CargoNoDisponible, CargoRepetido } from './errores-de-aplicaciones.js';
import {
  DemasiadosDocumentosEnPago,
  DiferenciaDePagoSobreElTope,
  DiferenciaFueraDelPago,
  DiferenciaMayorQueElSaldo,
  DocumentoFueraDeLaContrasena,
  DocumentoSinAutorizar,
  FechaInvalidaDelPago,
  MontoDePagoInvalido,
  PagoMayorQueElSaldo,
  PagoSinDocumentos,
} from './errores-de-registro-de-pago.js';
import { claseDe } from './tipos-de-documento.js';

/** Un pago lleva de 1 a 100 documentos. */
export const MAXIMO_DE_DOCUMENTOS_EN_PAGO = 100;

/** Clave del correlativo de los pagos en `core.correlativos`. */
export const CLAVE_DE_PAGOS = 'cuentas-por-pagar.pagos';

/** Lo que el pago entrega a un cargo, en centavos. */
export interface LineaPedida {
  cargoId: string;
  montoCentavos: number;
}

/** Un cargo con lo que todavía se debe de él y la contraseña vigente donde está (`null` si no está en ninguna). */
export interface CargoParaPagar {
  documento: DocumentoPorPagar;
  saldoCentavos: number;
  contrasenaId: string | null;
}

/**
 * De 1 a 100 documentos, cada monto mayor que cero y ningún cargo repetido.
 * @throws PagoSinDocumentos, DemasiadosDocumentosEnPago, MontoDePagoInvalido, CargoRepetido
 */
export function exigirLineasValidas(lineas: readonly LineaPedida[]): void {
  if (lineas.length === 0) throw new PagoSinDocumentos();
  if (lineas.length > MAXIMO_DE_DOCUMENTOS_EN_PAGO) throw new DemasiadosDocumentosEnPago(MAXIMO_DE_DOCUMENTOS_EN_PAGO);
  const vistos = new Set<string>();
  lineas.forEach(({ cargoId, montoCentavos }, indice) => {
    if (montoCentavos <= 0) throw new MontoDePagoInvalido(`aplicaciones.${indice}.monto`);
    if (vistos.has(cargoId)) throw new CargoRepetido(indice);
    vistos.add(cargoId);
  });
}

/**
 * El cargo se puede pagar: es un cargo vigente del proveedor, está en una contraseña vigente y está autorizado («solo se
 * paga lo autorizado»).
 * @throws CargoNoDisponible, DocumentoFueraDeLaContrasena, DocumentoSinAutorizar
 */
export function exigirCargoPagable(cargo: CargoParaPagar, proveedorId: string, indice: number): void {
  const { documento } = cargo;
  const etiqueta = etiquetaDe(documento);
  const esDelProveedor = documento.proveedorId === proveedorId;
  if (!esDelProveedor || claseDe(documento.tipo) !== 'cargo' || documento.estado === 'anulado') {
    throw new CargoNoDisponible(etiqueta, indice);
  }
  if (cargo.contrasenaId === null) throw new DocumentoFueraDeLaContrasena(etiqueta, indice);
  if (documento.estado !== 'autorizado') throw new DocumentoSinAutorizar(etiqueta);
}

/** @throws PagoMayorQueElSaldo si el monto pasa de lo que se debe del cargo. */
export function exigirMontoQueCabe(cargo: CargoParaPagar, montoCentavos: number, indice: number): void {
  if (montoCentavos > cargo.saldoCentavos) {
    throw new PagoMayorQueElSaldo(etiquetaDe(cargo.documento), cargo.saldoCentavos, indice);
  }
}

/**
 * La retención que este pago «descuenta» de un cargo: todas las suyas en su primer pago vigente y nada después. Un saldo
 * inicial ya viene neto de sus retenciones (U8): nunca se descuentan otra vez.
 */
export function retencionPorDescontar(documento: DocumentoPorPagar, yaDescontada: boolean): number {
  if (documento.origen !== 'libro_de_compras' || yaDescontada) return 0;
  return documento.retencionesCentavos;
}

/** Lo que fija la fecha mínima del pago: la emisión de cada documento y, con algún saldo inicial, la fecha de inicio. */
export interface LimitesDeFechaDelPago {
  emisiones: readonly string[];
  /** Solo si algún cargo es un saldo inicial; `null` si no. */
  fechaDeInicio: string | null;
}

/** La fecha más reciente que el pago no puede preceder: la emisión del DTE (no la recepción) y la fecha de inicio. */
export function fechaMinimaDelPago({ emisiones, fechaDeInicio }: LimitesDeFechaDelPago): string {
  const fechas = fechaDeInicio === null ? [...emisiones] : [...emisiones, fechaDeInicio];
  return fechas.reduce((mayor, fecha) => (fecha > mayor ? fecha : mayor));
}

/** @throws FechaInvalidaDelPago si la fecha es anterior a la mínima (puede ser futura: cheque posfechado). */
export function exigirFechaDelPago(fecha: string, minima: string): void {
  if (fecha < minima) throw new FechaInvalidaDelPago(minima);
}

/** La diferencia de centavos que el usuario da por saldada de un cargo del pago. */
export interface DiferenciaPedida {
  cargoId: string;
  montoCentavos: number;
}

/** Lo que queda de un cargo después de lo que este pago le entrega. */
export interface RestanteDelCargo {
  etiqueta: string;
  restanteCentavos: number;
}

/**
 * Cada diferencia es de un cargo del pago, mayor que cero, hasta el tope y hasta lo que le queda al cargo después del
 * pago (solo se salda un residuo, nunca un documento sin pagar).
 * @throws DiferenciaFueraDelPago, MontoDePagoInvalido, DiferenciaDePagoSobreElTope, DiferenciaMayorQueElSaldo
 */
export function exigirDiferenciasValidas(
  diferencias: readonly DiferenciaPedida[],
  restantes: ReadonlyMap<string, RestanteDelCargo>,
  topeCentavos: number,
): void {
  const vistos = new Set<string>();
  diferencias.forEach(({ cargoId, montoCentavos }, indice) => {
    const restante = restantes.get(cargoId);
    if (!restante || vistos.has(cargoId)) throw new DiferenciaFueraDelPago(indice);
    vistos.add(cargoId);
    if (montoCentavos <= 0) throw new MontoDePagoInvalido(`diferencias.${indice}.monto`);
    if (montoCentavos > topeCentavos) throw new DiferenciaDePagoSobreElTope(topeCentavos, indice);
    if (montoCentavos > restante.restanteCentavos) {
      throw new DiferenciaMayorQueElSaldo(restante.etiqueta, restante.restanteCentavos, indice);
    }
  });
}
