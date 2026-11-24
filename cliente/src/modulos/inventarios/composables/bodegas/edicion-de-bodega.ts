import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosBodega, Bodega } from '../../servicios/bodegas.api';

/** Lo que muestra cada campo del formulario mientras se edita una bodega. */
export interface EdicionDeBodega {
  abierta: boolean;
  id: string | null;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  responsable: string;
  responsableUsuarioId: string | null;
  activo: boolean;
}

const BODEGA_NUEVA: Omit<EdicionDeBodega, 'abierta' | 'id'> = {
  codigo: '',
  nombre: '',
  localidadId: null,
  responsable: '',
  responsableUsuarioId: null,
  activo: true,
};

/** El formulario abierto con los datos de la bodega, o vacío si es nueva. */
export function edicionDe(bodega?: Bodega): EdicionDeBodega {
  if (!bodega) return { abierta: true, id: null, ...BODEGA_NUEVA };
  return {
    abierta: true,
    id: bodega.id,
    codigo: textoDeEdicion(bodega.codigo),
    nombre: textoDeEdicion(bodega.nombre),
    localidadId: bodega.localidadId,
    responsable: textoDeEdicion(bodega.responsable),
    responsableUsuarioId: bodega.responsableUsuarioId,
    activo: bodega.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null`. */
export const datosDeBodega = (edicion: EdicionDeBodega): DatosBodega => ({
  codigo: edicion.codigo,
  nombre: edicion.nombre,
  localidadId: edicion.localidadId,
  responsable: textoONulo(edicion.responsable),
  responsableUsuarioId: edicion.responsableUsuarioId,
  activo: edicion.activo,
});

/** Lo que se le pregunta al operador antes de eliminar. */
export const mensajeDeEliminacion = (nombre: string): string =>
  `Se eliminará la bodega «${nombre}» y se quitará el acceso de los usuarios que la tienen asignada. Si ya tiene documentos no se podrá eliminar; en ese caso inactívela desde Editar. Esta acción no se puede deshacer.`;
