import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { ValeSolicitado } from '../../servicios/tipos-de-vales';
import { centavosDe } from '../dinero';

type Campo = string | number | null;

/** Entregar un vale provisional: efectivo del fondo a alguien que lo justificará después con comprobantes. */
export interface EdicionDeEntregaDeVale {
  monto: Campo;
  /** Vacía: la decide el servidor (hoy). */
  fecha: string;
  entregadoA: string;
  entregadoAUsuarioId: string | null;
  motivo: string;
}

export const edicionDeEntregaDeVale = (): EdicionDeEntregaDeVale => ({
  monto: '',
  fecha: '',
  entregadoA: '',
  entregadoAUsuarioId: null,
  motivo: '',
});

/** Lo que falta escribir antes de enviar; el servidor valida además que el monto no pase del efectivo esperado. */
export function faltaDeLaEntregaDelVale(edicion: EdicionDeEntregaDeVale): Record<string, string> {
  const faltantes: Record<string, string> = {};
  const monto = centavosDe(textoDeEdicion(edicion.monto));
  if (!monto) faltantes.monto = 'Escriba cuánto efectivo se entrega, mayor que cero y con hasta dos decimales.';
  if (!edicion.entregadoA.trim() && !edicion.entregadoAUsuarioId) {
    faltantes.entregadoA = 'Escriba o elija a quién se entrega el efectivo.';
  }
  if (!edicion.motivo.trim()) faltantes.motivo = 'Escriba para qué se entrega el efectivo.';
  return faltantes;
}

export function cuerpoDeEntregaDeVale(edicion: EdicionDeEntregaDeVale): ValeSolicitado {
  return {
    monto: textoDeEdicion(edicion.monto).trim(),
    ...(edicion.fecha.trim() ? { fecha: edicion.fecha.trim() } : {}),
    entregadoA: textoONulo(edicion.entregadoA),
    entregadoAUsuarioId: edicion.entregadoAUsuarioId,
    motivo: edicion.motivo.trim(),
  };
}
