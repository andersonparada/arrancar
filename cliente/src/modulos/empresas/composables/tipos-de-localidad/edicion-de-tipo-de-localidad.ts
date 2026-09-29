import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosTipoDeLocalidad, TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';

/** Lo que muestra cada campo de la ventana mientras se edita un tipo de localidad. */
export interface EdicionDeTipoDeLocalidad {
  abierta: boolean;
  id: string | null;
  nombre: string;
  activo: boolean;
}

/** Lo máximo que admite el servidor para el nombre. */
export const LARGO_MAXIMO_DEL_NOMBRE = 60;

/** Lo que se le pregunta al operador antes de eliminar. */
export const mensajeDeEliminacion = (nombre: string): string =>
  `Se eliminará el tipo de localidad «${nombre}». Si alguna localidad ya lo usa no se podrá eliminar; en ese caso inactívelo desde Editar.`;

const TIPO_DE_LOCALIDAD_NUEVO: Omit<EdicionDeTipoDeLocalidad, 'abierta' | 'id'> = {
  nombre: '',
  activo: true,
};

/** La ventana abierta con los datos del tipo de localidad, o vacía si es nuevo. */
export function edicionDe(tipoDeLocalidad?: TipoDeLocalidad): EdicionDeTipoDeLocalidad {
  if (!tipoDeLocalidad) return { abierta: true, id: null, ...TIPO_DE_LOCALIDAD_NUEVO };
  return {
    abierta: true,
    id: tipoDeLocalidad.id,
    nombre: textoDeEdicion(tipoDeLocalidad.nombre),
    activo: tipoDeLocalidad.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeTipoDeLocalidad = (edicion: EdicionDeTipoDeLocalidad): DatosTipoDeLocalidad => ({
  nombre: edicion.nombre.trim().slice(0, LARGO_MAXIMO_DEL_NOMBRE),
  activo: edicion.activo,
});
