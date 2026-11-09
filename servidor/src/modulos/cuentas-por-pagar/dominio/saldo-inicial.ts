import { VencimientoInvalido } from './errores.js';
import {
  EmisionNoAnteriorAlInicio,
  NumeroDeDocumentoInvalido,
  ReferenciaInvalida,
  RetencionesInvalidas,
  RetencionesPorPracticarInvalidas,
  SaldoPendienteInvalido,
  TotalInvalido,
} from './errores-de-saldos-iniciales.js';
import { claseDe, type TipoDeDocumento } from './tipos-de-documento.js';

const MAXIMO_DEL_NUMERO = 40;
const MAXIMO_DE_LA_REFERENCIA = 60;

/** Lo que se carga de un saldo inicial, con el dinero en centavos. */
export interface DatosDeSaldoInicial {
  proveedorId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  /** `AAAA-MM-DD`; `null` es «la propuesta de siempre» (una nota de crédito nunca lleva). */
  vencimiento: string | null;
  totalCentavos: number;
  /** Todas las retenciones del documento, practicadas o no. */
  retencionesCentavos: number;
  /** La parte de las retenciones que la empresa todavía no practicó (informativa). */
  retencionesPorPracticarCentavos: number;
  /** Lo que falta pagarle al proveedor al corte, sin retenciones. */
  saldoPendienteCentavos: number;
  referencia: string | null;
  tieneActivoFijo: boolean;
}

/** Si el valor está entre los dos límites, incluidos (falso con `NaN`). */
const entre = (valor: number, minimo: number, maximo: number): boolean => valor >= minimo && valor <= maximo;

/** Sin espacios y en mayúsculas, como lo guarda Libro de compras. Vacío queda en vacío. */
const normalizar = (texto: string): string => texto.replace(/\s+/g, '').toUpperCase();

function exigirLargoDelNumero(texto: string, campo: string): string {
  if (texto.length < 1 || texto.length > MAXIMO_DEL_NUMERO) {
    throw new NumeroDeDocumentoInvalido(`Escriba ${campo} de 1 a ${MAXIMO_DEL_NUMERO} caracteres.`, campo);
  }
  return texto;
}

/** La serie limpia como en Libro de compras; vacía = sin serie. @throws NumeroDeDocumentoInvalido si pasa de 40. */
export function limpiarSerie(serie: string | null): string | null {
  const limpia = normalizar(serie ?? '');
  return limpia === '' ? null : exigirLargoDelNumero(limpia, 'serie');
}

/** El número limpio como en Libro de compras. @throws NumeroDeDocumentoInvalido si falta o pasa de 40. */
export function limpiarNumero(numero: string): string {
  return exigirLargoDelNumero(normalizar(numero), 'numero');
}

/** La referencia recortada; vacía = `null`. @throws ReferenciaInvalida si pasa de 60. */
export function limpiarReferencia(referencia: string | null): string | null {
  const limpia = (referencia ?? '').trim();
  if (limpia.length > MAXIMO_DE_LA_REFERENCIA) throw new ReferenciaInvalida();
  return limpia === '' ? null : limpia;
}

/** La emisión es estrictamente anterior a la fecha de inicio. @throws EmisionNoAnteriorAlInicio */
export function exigirEmisionAnteriorAlInicio(fechaEmision: string, fechaDeInicio: string): void {
  if (fechaEmision >= fechaDeInicio) throw new EmisionNoAnteriorAlInicio(fechaDeInicio);
}

/**
 * Los montos: total mayor que cero; retenciones entre cero y el total (una nota de crédito no lleva); saldo pendiente
 * mayor que cero y hasta el total menos las retenciones; retenciones por practicar entre cero y las retenciones.
 * @throws TotalInvalido, RetencionesInvalidas, SaldoPendienteInvalido, RetencionesPorPracticarInvalidas
 */
export function exigirMontosValidos(datos: DatosDeSaldoInicial): void {
  const { totalCentavos, retencionesCentavos, saldoPendienteCentavos, retencionesPorPracticarCentavos } = datos;
  if (!entre(totalCentavos, 1, Infinity)) throw new TotalInvalido();
  const tope = claseDe(datos.tipo) === 'abono' ? 0 : totalCentavos;
  if (!entre(retencionesCentavos, 0, tope)) throw new RetencionesInvalidas();
  const neto = totalCentavos - retencionesCentavos;
  if (!entre(saldoPendienteCentavos, 1, neto)) throw new SaldoPendienteInvalido(neto);
  if (!entre(retencionesPorPracticarCentavos, 0, retencionesCentavos)) {
    throw new RetencionesPorPracticarInvalidas(retencionesCentavos);
  }
}

/** Una nota de crédito no vence; un cargo no vence antes de emitirse (sí puede vencer antes de la fecha de inicio). */
export function exigirVencimientoCoherente({ tipo, vencimiento, fechaEmision }: DatosDeSaldoInicial): void {
  if (vencimiento === null) return;
  if (claseDe(tipo) === 'abono') {
    throw new VencimientoInvalido('Una nota de crédito no vence: no lleva vencimiento.');
  }
  if (vencimiento < fechaEmision) {
    throw new VencimientoInvalido('El vencimiento no puede ser anterior a la fecha de emisión del documento.');
  }
}

/**
 * Valida un saldo inicial contra la fecha de inicio de la empresa y lo devuelve con serie, número y referencia limpios.
 * El proveedor y la propuesta de vencimiento los resuelve el caso de uso.
 */
export function prepararSaldoInicial(datos: DatosDeSaldoInicial, fechaDeInicio: string): DatosDeSaldoInicial {
  exigirEmisionAnteriorAlInicio(datos.fechaEmision, fechaDeInicio);
  const limpios = { ...datos, serie: limpiarSerie(datos.serie), numero: limpiarNumero(datos.numero) };
  exigirMontosValidos(limpios);
  const referencia = limpiarReferencia(datos.referencia);
  exigirVencimientoCoherente(limpios);
  return { ...limpios, referencia };
}
