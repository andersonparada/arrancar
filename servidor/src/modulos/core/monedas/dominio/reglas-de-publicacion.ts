import { fechaDelBanguatAIso, sumarDiasAFecha } from './fechas-de-publicacion.js';
import type { MotivoDeRechazo, PublicacionDeTipoDeCambio } from './publicacion.js';
import { revisarCompraYVenta } from './cruces-del-banguat.js';
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

/** Valores tal como vienen del servicio, antes de validarse (la fecha en `dd/mm/aaaa`). */
export interface ValorCrudo {
  readonly moneda: string;
  readonly codigoBanguat: number;
  readonly fecha: string;
  /** Solo si no vienen `compra` y `venta` (el valor único del día). */
  readonly referencia?: string;
  /** Solo en los rangos y en las demás monedas: con las dos, la referencia es su promedio. */
  readonly compra?: string;
  readonly venta?: string;
}

/** Lo que resulta de validar un valor: la publicación, o el motivo del rechazo. */
export type Validacion =
  | { readonly valida: true; readonly publicacion: PublicacionDeTipoDeCambio }
  | { readonly valida: false; readonly motivo: MotivoDeRechazo; readonly fecha: string };

interface ValorResuelto {
  readonly referencia: string;
  readonly compra?: string;
  readonly venta?: string;
}

/** El dólar tiene una sola referencia: `compra` y `venta` deben ser iguales. Las demás monedas se promedian. */
function resolverCompraYVenta(crudo: ValorCrudo, compra: string, venta: string): ValorResuelto | MotivoDeRechazo {
  const revision = revisarCompraYVenta(compra, venta);
  if (!revision.valida) return revision.motivo;
  if (crudo.moneda === 'USD' && revision.compra !== revision.venta) return 'valor_ambiguo';
  return { referencia: revision.promedio, compra: revision.compra, venta: revision.venta };
}

function resolverValor(crudo: ValorCrudo): ValorResuelto | MotivoDeRechazo {
  if (crudo.compra !== undefined && crudo.venta !== undefined) {
    return resolverCompraYVenta(crudo, crudo.compra, crudo.venta);
  }
  const referencia = referenciaEscalada(crudo.referencia ?? '');
  return referencia === undefined || referencia === 0n ? 'dato_invalido' : { referencia: textoDeEscalado(referencia) };
}

function fueraDeLaBanda(moneda: string, valor: ValorResuelto): boolean {
  return !dentroDeLaBanda(moneda, referenciaEscalada(valor.referencia) ?? 0n);
}

/**
 * Valida un valor recibido: fecha `dd/mm/aaaa` real y no posterior a mañana; referencia con el formato permitido y
 * mayor que cero o, si vienen `compra` y `venta`, `venta ≥ compra > 0` con un diferencial de hasta
 * 3 % (la referencia es el promedio, adenda B.5; el dólar exige que sean
 * iguales); y dentro de la banda de cordura de su moneda. `referencia`, `compra` y `venta` quedan tal como se
 * publicaron, sin pasar a quetzales (eso lo hace `normalizarAQuetzales`).
 */
export function validarPublicacion(crudo: ValorCrudo, hoy: string): Validacion {
  const fecha = fechaDelBanguatAIso(crudo.fecha);
  const valor = resolverValor(crudo);
  if (!fecha || fecha > sumarDiasAFecha(hoy, 1)) {
    return { valida: false, motivo: 'dato_invalido', fecha: fecha ?? crudo.fecha.slice(0, 10) };
  }
  if (typeof valor === 'string') return { valida: false, motivo: valor, fecha };
  if (fueraDeLaBanda(crudo.moneda, valor)) return { valida: false, motivo: 'valor_fuera_de_rango', fecha };
  const base = { moneda: crudo.moneda, codigoBanguat: crudo.codigoBanguat, fecha, ...valor };
  return { valida: true, publicacion: base };
}
