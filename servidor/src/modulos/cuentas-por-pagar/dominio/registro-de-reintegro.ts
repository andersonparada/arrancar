import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import type { LineaDeConcepto } from '../../core/contratos/bancos.contratos.js';
import { fechaMinimaDeAplicacion } from './aplicacion-manual.js';
import { etiquetaDe, type ContrasenaVigente, type DocumentoPorPagar } from './documento-por-pagar.js';
import {
  CuentaDelDepositoObligatoria,
  DemasiadasNotasEnReintegro,
  FechaDeReintegroInvalida,
  MontoDeReintegroInvalido,
  NotaDeOtroProveedor,
  NotaRepetidaEnReintegro,
  ReferenciaDeReintegroInvalida,
  ReferenciaDelReciboObligatoria,
  ReintegroMayorQueElSaldoLibre,
  ReintegroSinNotas,
} from './errores-de-reintegros.js';
import { exigirNotaFueraDeContrasena } from './nota-en-contrasena.js';
import { exigirNotaQueSeAjusta } from './reglas-de-ajuste.js';
import { MAXIMO_DE_NOTAS_POR_REINTEGRO, type FormaDeReintegro, type NotaDelReintegro } from './reintegros.js';

const MAXIMO_DE_LA_REFERENCIA = 100;

/** La nota pedida con su monto ya en centavos. */
export type NotaPedida = NotaDelReintegro;

/** Una nota bloqueada con lo que hace falta para revisarla. */
export interface NotaPorReintegrar {
  documento: DocumentoPorPagar;
  saldoLibreCentavos: number;
  contrasenaVigente: ContrasenaVigente | null;
}

/** Los montos pedidos, de texto a centavos. */
export const notasEnCentavos = (notas: readonly { notaId: string; monto: string }[]): NotaPedida[] =>
  notas.map(({ notaId, monto }) => ({ notaId, montoCentavos: aCentavos(monto) }));

/**
 * De 1 a 100 notas, cada monto mayor que cero y ninguna repetida.
 * @throws ReintegroSinNotas, DemasiadasNotasEnReintegro, MontoDeReintegroInvalido, NotaRepetidaEnReintegro
 */
export function exigirNotasValidas(notas: readonly NotaPedida[]): void {
  if (notas.length === 0) throw new ReintegroSinNotas();
  if (notas.length > MAXIMO_DE_NOTAS_POR_REINTEGRO) throw new DemasiadasNotasEnReintegro(MAXIMO_DE_NOTAS_POR_REINTEGRO);
  const vistas = new Set<string>();
  notas.forEach(({ notaId, montoCentavos }, indice) => {
    if (montoCentavos <= 0) throw new MontoDeReintegroInvalido(indice);
    if (vistas.has(notaId)) throw new NotaRepetidaEnReintegro(indice);
    vistas.add(notaId);
  });
}

/**
 * Una nota de crédito registrada o autorizada (como el ajuste), del proveedor, fuera de una contraseña vigente y con el
 * monto dentro de su saldo libre.
 * @throws NoEsNotaConSaldo, NotaPendienteNoSeAjusta, NotaDeOtroProveedor, NotaEnContrasena, ReintegroMayorQueElSaldoLibre
 */
export function exigirNotaQueSeReintegra(
  nota: NotaPorReintegrar,
  pedida: { proveedorId: string; montoCentavos: number; indice: number },
): void {
  exigirNotaQueSeAjusta(nota.documento);
  if (nota.documento.proveedorId !== pedida.proveedorId) {
    throw new NotaDeOtroProveedor(etiquetaDe(nota.documento), pedida.indice);
  }
  exigirNotaFueraDeContrasena(nota.documento, nota.contrasenaVigente);
  if (pedida.montoCentavos > nota.saldoLibreCentavos) {
    throw new ReintegroMayorQueElSaldoLibre(etiquetaDe(nota.documento), nota.saldoLibreCentavos, pedida.indice);
  }
}

/** La referencia sin espacios sobrantes; vacía es nula. @throws ReferenciaDeReintegroInvalida si pasa de 100. */
function referenciaLimpia(referencia: string | null | undefined): string | null {
  const limpia = referencia?.trim() ?? '';
  if (limpia.length > MAXIMO_DE_LA_REFERENCIA) throw new ReferenciaDeReintegroInvalida(MAXIMO_DE_LA_REFERENCIA);
  return limpia === '' ? null : limpia;
}

/**
 * Lo que lleva cada forma: el depósito, la cuenta donde cayó; el efectivo, la referencia de su recibo. Devuelve la
 * referencia limpia.
 * @throws CuentaDelDepositoObligatoria, ReferenciaDelReciboObligatoria, ReferenciaDeReintegroInvalida
 */
export function exigirMedioDeCobro(medio: {
  forma: FormaDeReintegro;
  cuentaBancariaId?: string | null;
  referencia?: string | null;
}): string | null {
  const referencia = referenciaLimpia(medio.referencia);
  if (medio.forma === 'deposito' && !medio.cuentaBancariaId) throw new CuentaDelDepositoObligatoria();
  if (medio.forma === 'efectivo' && referencia === null) throw new ReferenciaDelReciboObligatoria();
  return referencia;
}

/**
 * La fecha del reintegro: no futura y no anterior a la recepción de ninguna nota (o a la fecha de inicio, si alguna es un
 * saldo inicial).
 * @throws FechaDeReintegroInvalida
 */
export function exigirFechaDeReintegro(
  fecha: string,
  hoy: string,
  origenes: { recepciones: readonly (string | null)[]; fechaDeInicio: string | null },
): void {
  const minima = fechaMinimaDeAplicacion(origenes);
  const sinInicio = origenes.fechaDeInicio === null && origenes.recepciones.includes(null);
  if (sinInicio || fecha > hoy || (minima !== null && fecha < minima)) throw new FechaDeReintegroInvalida(minima);
}

/**
 * El reparto del depósito por concepto (C-CP4-6): lo de notas cuya factura es de activo fijo va a «Reintegro de proveedores
 * de activo fijo» (Inversión) y el resto a «Reintegro de proveedores» (Operación).
 */
export function conceptosDelReintegro(
  notas: readonly { montoCentavos: number; deActivoFijo: boolean }[],
): LineaDeConcepto[] {
  const total = notas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
  const deActivo = notas
    .filter(({ deActivoFijo }) => deActivoFijo)
    .reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
  const conceptos: LineaDeConcepto[] = [
    { claveDeSistema: 'reintegro_de_proveedor', montoCentavos: total - deActivo },
    { claveDeSistema: 'reintegro_de_proveedor_de_activo', montoCentavos: deActivo },
  ];
  return conceptos.filter(({ montoCentavos }) => montoCentavos > 0);
}
