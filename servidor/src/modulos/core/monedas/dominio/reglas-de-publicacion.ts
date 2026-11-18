import { fechaDelBanguatAIso, sumarDiasAFecha } from './fechas-de-publicacion.js';
import type { MotivoDeRechazo, PublicacionDeTipoDeCambio } from './publicacion.js';

const FORMATO_REFERENCIA = /^(\d{1,6})(?:\.(\d{1,8}))?$/;
const ESCALA = 8;

/** Banda de cordura por moneda, en quetzales por unidad: fuera de ella el valor no se guarda. */
export const BANDAS_DE_CORDURA: Readonly<Record<string, { minimo: number; maximo: number }>> = {
  USD: { minimo: 5, maximo: 15 },
};

/** Si la referencia nueva difiere más de este porcentaje de la anterior se guarda, pero con aviso. */
export const VARIACION_MAXIMA_EN_PORCIENTO = 3;

/** El texto decimal como entero escalado × 10⁸, o `undefined` si no cumple `^\d{1,6}(\.\d{1,8})?$`. */
export function referenciaEscalada(texto: string): bigint | undefined {
  const partes = FORMATO_REFERENCIA.exec(texto);
  if (!partes) return undefined;
  return BigInt(partes[1]! + (partes[2] ?? '').padEnd(ESCALA, '0'));
}

/** Si `moneda` tiene banda de cordura, el valor debe caer dentro de ella (extremos incluidos). */
export function dentroDeLaBanda(moneda: string, referencia: bigint): boolean {
  const banda = BANDAS_DE_CORDURA[moneda];
  if (!banda) return true;
  const unidad = 10n ** BigInt(ESCALA);
  return referencia >= BigInt(banda.minimo) * unidad && referencia <= BigInt(banda.maximo) * unidad;
}

/** Si `nueva` difiere de `anterior` más de {@link VARIACION_MAXIMA_EN_PORCIENTO} %. Aritmética entera. */
export function variacionSuperaElLimite(anterior: string, nueva: string): boolean {
  const antes = referenciaEscalada(anterior);
  const ahora = referenciaEscalada(nueva);
  if (antes === undefined || ahora === undefined || antes === 0n) return false;
  const diferencia = ahora > antes ? ahora - antes : antes - ahora;
  return diferencia * 100n > BigInt(VARIACION_MAXIMA_EN_PORCIENTO) * antes;
}

/** Valores tal como vienen del servicio, antes de validarse (la fecha en `dd/mm/aaaa`). */
export interface ValorCrudo {
  readonly moneda: string;
  readonly fecha: string;
  readonly referencia: string;
}

/** Lo que resulta de validar un valor: la publicación, o el motivo del rechazo. */
export type Validacion =
  | { readonly valida: true; readonly publicacion: PublicacionDeTipoDeCambio }
  | { readonly valida: false; readonly motivo: MotivoDeRechazo; readonly fecha: string };

/**
 * Valida un valor recibido: fecha `dd/mm/aaaa` real y no posterior a mañana, referencia con el formato
 * permitido y mayor que cero, y dentro de la banda de cordura de su moneda.
 */
export function validarPublicacion(crudo: ValorCrudo, hoy: string): Validacion {
  const fecha = fechaDelBanguatAIso(crudo.fecha);
  const referencia = referenciaEscalada(crudo.referencia);
  if (!fecha || referencia === undefined || referencia === 0n || fecha > sumarDiasAFecha(hoy, 1)) {
    return { valida: false, motivo: 'dato_invalido', fecha: fecha ?? crudo.fecha.slice(0, 10) };
  }
  if (!dentroDeLaBanda(crudo.moneda, referencia)) return { valida: false, motivo: 'valor_fuera_de_rango', fecha };
  return { valida: true, publicacion: { moneda: crudo.moneda, fecha, referencia: crudo.referencia } };
}
