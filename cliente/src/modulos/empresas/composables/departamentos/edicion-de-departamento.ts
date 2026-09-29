import { textoDeEdicion } from '@/modulos/core/utilidades/edicion';
import type { DatosDepartamento, Departamento } from '../../servicios/departamentos.api';

/** Lo que muestra cada campo de la ventana mientras se edita un departamento. */
export interface EdicionDeDepartamento {
  abierta: boolean;
  id: string | null;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  activo: boolean;
}

const DEPARTAMENTO_NUEVO: Omit<EdicionDeDepartamento, 'abierta' | 'id'> = {
  codigo: '',
  nombre: '',
  localidadId: null,
  activo: true,
};

/** La ventana abierta con los datos del departamento, o vacía si es nuevo. */
export function edicionDe(departamento?: Departamento): EdicionDeDepartamento {
  if (!departamento) return { abierta: true, id: null, ...DEPARTAMENTO_NUEVO };
  return {
    abierta: true,
    id: departamento.id,
    codigo: textoDeEdicion(departamento.codigo),
    nombre: textoDeEdicion(departamento.nombre),
    localidadId: departamento.localidadId,
    activo: departamento.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeDepartamento = (edicion: EdicionDeDepartamento): DatosDepartamento => ({
  codigo: edicion.codigo,
  nombre: edicion.nombre,
  localidadId: edicion.localidadId,
  activo: edicion.activo,
});
