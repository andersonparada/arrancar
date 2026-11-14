import { MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA, MAXIMO_DE_OBSERVACIONES } from './contrasena.js';
import { etiquetaDe, type DocumentoPorPagar } from './documento-por-pagar.js';
import {
  ContrasenaSinCargos,
  DemasiadosDocumentosEnContrasena,
  DocumentoDeOtroProveedor,
  DocumentoNoDisponibleParaContrasena,
  DocumentosRepetidosEnContrasena,
  DocumentoYaEnContrasena,
  FechaDeContrasenaInvalida,
  FechaDePagoInvalida,
  ObservacionesDeContrasenaInvalidas,
} from './errores-de-contrasenas.js';
import { claseDe } from './tipos-de-documento.js';

/** Un documento con lo que debe (cargo) o lo que tiene libre a favor (nota de crédito), en centavos. */
export interface DocumentoParaContrasena {
  documento: DocumentoPorPagar;
  saldoCentavos: number;
}

/**
 * Los ids pedidos: de uno a cien y sin repetir.
 * @throws ContrasenaSinCargos, DemasiadosDocumentosEnContrasena, DocumentosRepetidosEnContrasena
 */
export function exigirDocumentosPedidos(ids: readonly string[]): void {
  if (ids.length === 0) throw new ContrasenaSinCargos();
  if (ids.length > MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA) {
    throw new DemasiadosDocumentosEnContrasena(MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA);
  }
  if (new Set(ids).size !== ids.length) throw new DocumentosRepetidosEnContrasena();
}

/**
 * El documento puede entrar: es del proveedor, no está anulado, no está en otra contraseña vigente y un cargo debe algo
 * o una nota tiene saldo libre.
 * @param numeroDeOtraContrasena la contraseña vigente donde ya está, si está en una.
 * @throws DocumentoDeOtroProveedor, DocumentoNoDisponibleParaContrasena, DocumentoYaEnContrasena
 */
export function exigirDocumentoDisponible(
  { documento, saldoCentavos }: DocumentoParaContrasena,
  proveedorId: string,
  numeroDeOtraContrasena: string | null,
): void {
  const etiqueta = etiquetaDe(documento);
  if (documento.proveedorId !== proveedorId) throw new DocumentoDeOtroProveedor(etiqueta);
  if (documento.estado === 'anulado') throw new DocumentoNoDisponibleParaContrasena(etiqueta, 'anulado');
  if (numeroDeOtraContrasena !== null) throw new DocumentoYaEnContrasena(etiqueta, numeroDeOtraContrasena);
  if (saldoCentavos <= 0) {
    const esCargo = claseDe(documento.tipo) === 'cargo';
    throw new DocumentoNoDisponibleParaContrasena(etiqueta, esCargo ? 'sin_deuda' : 'sin_saldo_a_favor');
  }
}

/** @throws ContrasenaSinCargos si ningún documento es un cargo. */
export function exigirAlMenosUnCargo(documentos: readonly DocumentoPorPagar[]): void {
  if (!documentos.some(({ tipo }) => claseDe(tipo) === 'cargo')) throw new ContrasenaSinCargos();
}

/** Lo que limita la fecha de una contraseña. */
export interface LimitesDeLaFecha {
  hoy: string;
  /** La emisión de cada documento. */
  emisiones: readonly string[];
  /** La fecha de inicio de la empresa; nula si todavía no la tiene. */
  fechaDeInicio: string | null;
}

/**
 * La fecha de la contraseña no es futura ni anterior a la emisión de sus documentos ni a la fecha de inicio.
 * @throws FechaDeContrasenaInvalida
 */
export function exigirFechaDeContrasena(fecha: string, { hoy, emisiones, fechaDeInicio }: LimitesDeLaFecha): void {
  const anterior = emisiones.some((emision) => fecha < emision) || (fechaDeInicio !== null && fecha < fechaDeInicio);
  if (fecha > hoy || anterior) throw new FechaDeContrasenaInvalida();
}

/** @throws FechaDePagoInvalida si la fecha prometida es anterior a la de la contraseña. */
export function exigirFechaDePago(fechaDePago: string, fecha: string): void {
  if (fechaDePago < fecha) throw new FechaDePagoInvalida(fecha);
}

/** Las observaciones sin espacios sobrantes; vacías son nulas. @throws ObservacionesDeContrasenaInvalidas si pasan de 500. */
export function observacionesDeContrasena(observaciones: string | null | undefined): string | null {
  const limpias = observaciones?.trim() ?? '';
  if (limpias.length > MAXIMO_DE_OBSERVACIONES) throw new ObservacionesDeContrasenaInvalidas(MAXIMO_DE_OBSERVACIONES);
  return limpias === '' ? null : limpias;
}
