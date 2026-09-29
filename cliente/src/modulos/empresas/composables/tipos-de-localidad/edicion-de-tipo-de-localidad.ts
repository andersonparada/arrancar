import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosTipoDeLocalidad, TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';

/** Lo que muestra cada campo de la ventana mientras se edita un tipo de localidad. */
export interface EdicionDeTipoDeLocalidad {
  abierta: boolean;
  id: string | null;
  nombre: string;
  activo: boolean;
}

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
  nombre: edicion.nombre,
  activo: edicion.activo,
});
