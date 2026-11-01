import { usarSesion } from '@/modulos/core/almacenes/sesion';
import {
  usarAnulacion,
  usarCambioDeVencimiento,
  usarDesautorizacion,
  type FichaActual,
} from './usar-acciones-con-ventana';
import { usarAutorizacion } from './usar-autorizacion';
import { usarEliminacion } from './usar-eliminacion';

const PERMISO_PARA_AUTORIZAR_PROPIOS = 'cuentas-por-pagar.documentos.autorizar-propios';

/**
 * Todo lo que se hace desde la ficha de un documento. Después de cada acción `recargar` vuelve a leer la ficha, y
 * `alEliminar` saca al usuario de ella cuando el documento ya no existe.
 */
export function usarAccionesDelDocumento(ficha: FichaActual, recargar: () => Promise<void>, alEliminar: () => void) {
  const autorizacion = usarAutorizacion(recargar);
  return {
    autorizacion,
    desautorizacion: usarDesautorizacion(ficha, recargar),
    vencimiento: usarCambioDeVencimiento(ficha, recargar),
    anulacion: usarAnulacion(ficha, recargar),
    eliminacion: usarEliminacion(ficha, alEliminar),
    puedeAutorizarPropios: usarSesion().puede(PERMISO_PARA_AUTORIZAR_PROPIOS),
    autorizar: () => (ficha.value ? autorizacion.autorizar([ficha.value]) : Promise.resolve()),
  };
}
