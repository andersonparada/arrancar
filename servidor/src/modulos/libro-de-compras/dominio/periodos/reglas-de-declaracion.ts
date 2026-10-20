import type { RegimenDeIva } from '../datos-fiscales-de-empresa.js';
import { primerDiaDelMes, sumarMeses } from '../periodo-del-libro.js';
import {
  FechaDePresentacionInvalida,
  MotivoDelPeriodoInvalido,
  NumeroDeFormularioInvalido,
  PeriodoSinTerminar,
} from './errores-de-periodos.js';

export const EVENTOS_DE_DECLARACION = ['declaracion', 'reapertura', 'rectificacion'] as const;
export type EventoDeDeclaracion = (typeof EVENTOS_DE_DECLARACION)[number];

export const FORMULARIOS_DE_DECLARACION = ['SAT-2237', 'SAT-2046', 'sin_formulario'] as const;
export type FormularioDeDeclaracion = (typeof FORMULARIOS_DE_DECLARACION)[number];

const MAXIMO_DEL_MOTIVO = 500;

/** El formulario en que se declara el período según el régimen de IVA: general SAT-2237, pequeño contribuyente SAT-2046. */
export function formularioDelRegimen(regimen: RegimenDeIva): FormularioDeDeclaracion {
  if (regimen === 'general') return 'SAT-2237';
  return regimen === 'pequeno_contribuyente' || regimen === 'pequeno_contribuyente_electronico'
    ? 'SAT-2046'
    : 'sin_formulario';
}

/** Solo se declaran meses completos: el período debe ser anterior al mes de hoy. */
export function exigirPeriodoTerminado(periodo: string, hoy: string): void {
  if (periodo >= primerDiaDelMes(hoy)) throw new PeriodoSinTerminar(periodo);
}

/** Se presenta a partir del mes siguiente al período. */
export function exigirFechaDePresentacion(periodo: string, fecha: string | null): void {
  const primerDia = sumarMeses(periodo, 1);
  if (fecha !== null && fecha < primerDia) throw new FechaDePresentacionInvalida(primerDia);
}

/** El número es opcional; si llega, son letras o dígitos (sin espacios) y el período no puede estar «sin formulario». */
export function numeroDeFormularioValido(
  numero: string | null | undefined,
  formulario: FormularioDeDeclaracion,
): string | null {
  const limpio = numero?.replace(/[\s-]/g, '').toUpperCase();
  if (!limpio) return null;
  if (formulario === 'sin_formulario') {
    throw new NumeroDeFormularioInvalido('Un período «sin formulario» no lleva número de formulario.');
  }
  if (!/^[A-Z0-9]{1,40}$/.test(limpio)) throw new NumeroDeFormularioInvalido();
  return limpio;
}

/** El motivo de una reapertura o de apagar el bloqueo: de 1 a 500 caracteres. */
export function motivoDelPeriodoValido(motivo: string | undefined): string {
  const limpio = motivo?.trim() ?? '';
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDelPeriodoInvalido();
  return limpio;
}

/** La primera vez es `declaracion`; toda declaración posterior (con o sin reapertura de por medio) es `rectificacion`. */
export const eventoDeLaDeclaracion = (declaracionesPrevias: number): EventoDeDeclaracion =>
  declaracionesPrevias === 0 ? 'declaracion' : 'rectificacion';
