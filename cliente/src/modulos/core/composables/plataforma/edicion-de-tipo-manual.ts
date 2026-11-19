import type { TipoManual, VersionDeTipo } from '../../servicios/tipos-de-cambio.api';
import { textoONulo } from '../../utilidades/edicion';
import { formatearTipoDeCambio } from '../../utilidades/formato';

/** La ventana para ingresar o corregir el tipo de un día; sus `versiones` (la más nueva primero) se traen del servidor. */
export interface FormularioDeTipo {
  abierta: boolean;
  moneda: string;
  fecha: string;
  /** El día viene del calendario: no se cambia, y se ven sus versiones. */
  fechaFija: boolean;
  referencia: string;
  compra: string;
  venta: string;
  motivo: string;
  versiones: VersionDeTipo[];
}

/** Hasta 8 enteros y 8 decimales, como el servidor. */
const FORMATO_DEL_TIPO = /^\d{1,8}(\.\d{1,8})?$/;
/** Cambio contra el valor vigente a partir del cual se avisa al confirmar. */
export const VARIACION_PARA_AVISAR_EN_PORCIENTO = 3;
const LARGO_DEL_MOTIVO = 300;

export const formularioDeTipoVacio = (): FormularioDeTipo => ({
  abierta: false,
  moneda: '',
  fecha: '',
  fechaFija: false,
  referencia: '',
  compra: '',
  venta: '',
  motivo: '',
  versiones: [],
});

/** Un tipo nuevo: pide moneda y fecha (por omisión, hoy). */
export const formularioDeTipoNuevo = (moneda: string, hoy: string): FormularioDeTipo => ({
  ...formularioDeTipoVacio(),
  abierta: true,
  moneda,
  fecha: hoy,
});

/** Corregir o completar un día del calendario. */
export const formularioDeTipoDelDia = (moneda: string, fecha: string): FormularioDeTipo => ({
  ...formularioDeTipoNuevo(moneda, fecha),
  fechaFija: true,
});

/** Lo que rige hoy ese día: su versión más nueva, si hay alguna. */
export const vigenteDelDia = (form: FormularioDeTipo): VersionDeTipo | null => form.versiones[0] ?? null;

function errorDelValor(texto: string, obligatorio: boolean): string | undefined {
  const valor = texto.trim();
  if (!valor) return obligatorio ? 'Escriba el tipo de cambio.' : undefined;
  if (!FORMATO_DEL_TIPO.test(valor) || Number(valor) <= 0)
    return 'Escriba un número mayor que cero, con punto y hasta 8 decimales. Ej. 7.64489';
  return undefined;
}

/** Lo que falta o está mal antes de mandarlo, con cómo corregirlo. */
export function erroresDelTipo(form: FormularioDeTipo): Record<string, string> {
  const errores: Record<string, string | undefined> = {
    moneda: form.moneda ? undefined : 'Elija la moneda.',
    fecha: form.fecha ? undefined : 'Elija el día al que corresponde el tipo.',
    referencia: errorDelValor(form.referencia, true),
    compra: errorDelValor(form.compra, false),
    venta: errorDelValor(form.venta, false),
    motivo: motivoValido(form.motivo),
  };
  return Object.fromEntries(Object.entries(errores).filter(([, mensaje]) => mensaje !== undefined)) as Record<
    string,
    string
  >;
}

function motivoValido(motivo: string): string | undefined {
  if (!motivo.trim()) return 'Explique por qué lo ingresa o corrige (queda en el historial del día).';
  return motivo.trim().length > LARGO_DEL_MOTIVO
    ? `El motivo no puede pasar de ${LARGO_DEL_MOTIVO} caracteres.`
    : undefined;
}

export function datosDelTipo(form: FormularioDeTipo): TipoManual {
  return {
    moneda: form.moneda,
    fecha: form.fecha,
    referencia: form.referencia.trim(),
    compra: textoONulo(form.compra),
    venta: textoONulo(form.venta),
    motivo: form.motivo.trim(),
  };
}

/** Cuánto cambia el valor nuevo contra el vigente, en porciento; `null` si no hay con qué comparar. */
export function variacionEnPorciento(nuevo: string, vigente: string | null | undefined): number | null {
  const anterior = Number(vigente);
  if (!vigente || !Number.isFinite(anterior) || anterior <= 0) return null;
  return ((Number(nuevo) - anterior) / anterior) * 100;
}

/** El resumen de lo que va a pasar, para confirmar antes de guardar. */
export function resumenDelGuardado(form: FormularioDeTipo, formatearFecha: (fecha: string) => string): string {
  const nuevo = formatearTipoDeCambio(form.referencia.trim());
  const dia = formatearFecha(form.fecha);
  const vigente = vigenteDelDia(form);
  const base = `Se registrará Q ${nuevo} por unidad de ${form.moneda} para el ${dia}.`;
  if (!vigente) return `${base} Ese día aún no tiene tipo.`;
  const origen = vigente.origen === 'banguat' ? 'del Banguat' : 'ingresado a mano';
  const variacion = variacionEnPorciento(form.referencia.trim(), vigente.referencia);
  const aviso =
    variacion !== null && Math.abs(variacion) > VARIACION_PARA_AVISAR_EN_PORCIENTO
      ? ` Es ${Math.abs(variacion).toFixed(1)} % ${variacion > 0 ? 'más' : 'menos'} que el vigente: revise que no falte o sobre un dígito.`
      : '';
  return `${base} Reemplaza al vigente (Q ${formatearTipoDeCambio(vigente.referencia)}, ${origen}); ese queda en el historial.${aviso}`;
}
