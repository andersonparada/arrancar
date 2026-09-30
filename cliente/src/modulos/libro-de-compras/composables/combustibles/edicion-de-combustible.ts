import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosCombustible, Combustible } from '../../servicios/combustibles.api';

/** Lo que muestra cada campo de la ventana mientras se edita un combustible. */
export interface EdicionDeCombustible {
  abierta: boolean;
  id: string | null;
  nombre: string;
  activo: boolean;
}

const COMBUSTIBLE_NUEVO: Omit<EdicionDeCombustible, 'abierta' | 'id'> = {
  nombre: '',
  activo: true,
};

/** La ventana abierta con los datos del combustible, o vacía si es nuevo. */
export function edicionDe(combustible?: Combustible): EdicionDeCombustible {
  if (!combustible) return { abierta: true, id: null, ...COMBUSTIBLE_NUEVO };
  return {
    abierta: true,
    id: combustible.id,
    nombre: textoDeEdicion(combustible.nombre),
    activo: combustible.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeCombustible = (edicion: EdicionDeCombustible): DatosCombustible => ({
  nombre: edicion.nombre,
  activo: edicion.activo,
});
