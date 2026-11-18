import { fechaDelBanguatAIso, sumarDiasAFecha } from './fechas-de-publicacion.js';
import type { MotivoDeRechazo, PublicacionDeTipoDeCambio } from './publicacion.js';
import { ESCALA, referenciaEscalada, textoDeEscalado } from './valores-decimales.js';

export { referenciaEscalada } from './valores-decimales.js';

/** Banda de cordura por moneda, en quetzales por unidad: fuera de ella el valor no se guarda. Solo el USD tiene. */
export const BANDAS_DE_CORDURA: Readonly<Record<string, { minimo: number; maximo: number }>> = {
  USD: { minimo: 5, maximo: 15 },
};

/** Si la referencia nueva difiere más de este porcentaje de la anterior se guarda, pero con aviso. */
export const VARIACION_MAXIMA_EN_PORCIENTO = 3;

/** Las monedas sin banda se protegen de un cambio de unidad o de un código mal puesto: más de esto no se guarda. */
export const VARIACION_PARA_RECHAZAR_EN_PORCIENTO = 25;

/** Si `moneda` tiene banda de cordura, el valor debe caer dentro de ella (extremos incluidos). */
export function dentroDeLaBanda(moneda: string, referencia: bigint): boolean {
  const banda = BANDAS_DE_CORDURA[moneda];
  if (!banda) return true;
  const unidad = 10n ** BigInt(ESCALA);
  return referencia >= BigInt(banda.minimo) * unidad && referencia <= BigInt(banda.maximo) * unidad;
}

function variacionSupera(anterior: string, nueva: string, porciento: number): boolean {
  const antes = referenciaEscalada(anterior);
  const ahora = referenciaEscalada(nueva);
  if (antes === undefined || ahora === undefined || antes === 0n) return false;
  const diferencia = ahora > antes ? ahora - antes : antes - ahora;
  return diferencia * 100n > BigInt(porciento) * antes;
}

/** Si `nueva` difiere de `anterior` más de {@link VARIACION_MAXIMA_EN_PORCIENTO} %. Aritmética entera. */
export function variacionSuperaElLimite(anterior: string, nueva: string): boolean {
  return variacionSupera(anterior, nueva, VARIACION_MAXIMA_EN_PORCIENTO);
}

/** Si `nueva` difiere de `anterior` más de {@link VARIACION_PARA_RECHAZAR_EN_PORCIENTO} %: no se guarda. */
export function variacionSuperaElRechazo(anterior: string, nueva: string): boolean {
  return variacionSupera(anterior, nueva, VARIACION_PARA_RECHAZAR_EN_PORCIENTO);
}

/**
 * El cruce implícito de una moneda contra el USD del mismo día: `valor ÷ referenciaUsd`, a 8 decimales.
 * Sirve para avisar si cambia más de {@link VARIACION_MAXIMA_EN_PORCIENTO} %. `undefined` si algún dato no es válido.
 */
export function cruceImplicito(valor: string, referenciaUsd: string): string | undefined {
  const arriba = referenciaEscalada(valor);
  const abajo = referenciaEscalada(referenciaUsd);
  if (arriba === undefined || abajo === undefined || abajo === 0n) return undefined;
  return textoDeEscalado((arriba * 10n ** BigInt(ESCALA) + abajo / 2n) / abajo);
}

/** Valores tal como vienen del servicio, antes de validarse (la fecha en `dd/mm/aaaa`). */
export interface ValorCrudo {
  readonly moneda: string;
  readonly codigoBanguat: number;
  readonly fecha: string;
  readonly referencia: string;
  /** Solo en los rangos: si ambas vienen y difieren, el valor es ambiguo. */
  readonly compra?: string;
  readonly venta?: string;
}

/** Lo que resulta de validar un valor: la publicación, o el motivo del rechazo. */
export type Validacion =
  | { readonly valida: true; readonly publicacion: PublicacionDeTipoDeCambio }
  | { readonly valida: false; readonly motivo: MotivoDeRechazo; readonly fecha: string };

function esAmbiguo(crudo: ValorCrudo): boolean {
  if (crudo.compra === undefined || crudo.venta === undefined) return false;
  const compra = referenciaEscalada(crudo.compra);
  return compra === undefined || compra !== referenciaEscalada(crudo.venta);
}

function publicacionValida(crudo: ValorCrudo, fecha: string, referencia: bigint): PublicacionDeTipoDeCambio {
  const texto = textoDeEscalado(referencia);
  const base = { moneda: crudo.moneda, codigoBanguat: crudo.codigoBanguat, fecha, referencia: texto };
  return crudo.compra === undefined ? base : { ...base, compra: texto, venta: texto };
}

function motivoDeRechazo(crudo: ValorCrudo, referencia: bigint): MotivoDeRechazo | undefined {
  if (esAmbiguo(crudo)) return 'valor_ambiguo';
  return dentroDeLaBanda(crudo.moneda, referencia) ? undefined : 'valor_fuera_de_rango';
}

/**
 * Valida un valor recibido: fecha `dd/mm/aaaa` real y no posterior a mañana, referencia con el formato
 * permitido y mayor que cero, `compra = venta` si vienen las dos, y dentro de la banda de cordura de su moneda.
 */
export function validarPublicacion(crudo: ValorCrudo, hoy: string): Validacion {
  const fecha = fechaDelBanguatAIso(crudo.fecha);
  const referencia = referenciaEscalada(crudo.referencia);
  if (!fecha || referencia === undefined || referencia === 0n || fecha > sumarDiasAFecha(hoy, 1)) {
    return { valida: false, motivo: 'dato_invalido', fecha: fecha ?? crudo.fecha.slice(0, 10) };
  }
  const motivo = motivoDeRechazo(crudo, referencia);
  if (motivo) return { valida: false, motivo, fecha };
  return { valida: true, publicacion: publicacionValida(crudo, fecha, referencia) };
}
