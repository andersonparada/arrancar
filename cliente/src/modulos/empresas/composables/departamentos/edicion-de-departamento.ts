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

/** Lo máximo que admite el servidor para el código interno. */
export const LARGO_MAXIMO_DEL_CODIGO = 12;

/** El código interno se escribe siempre en mayúsculas y sin espacios. */
export const codigoEnMayusculas = (texto: string): string => texto.replace(/\s/g, '').toUpperCase();

/** Lo que se le pregunta al operador antes de eliminar. */
export const mensajeDeEliminacion = (nombre: string): string =>
  `Se eliminará el departamento «${nombre}». Si ya tiene registros no se podrá eliminar; en ese caso inactívelo desde Editar. Esta acción no se puede deshacer.`;

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
  codigo: codigoEnMayusculas(edicion.codigo),
  nombre: edicion.nombre.trim(),
  localidadId: edicion.localidadId,
  activo: edicion.activo,
});
