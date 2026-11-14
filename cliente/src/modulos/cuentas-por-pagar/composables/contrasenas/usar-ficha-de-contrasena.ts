import { watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiContrasenas, type FichaDeContrasena } from '../../servicios/contrasenas.api';
import {
  usarAgregarDocumentos,
  usarAnularContrasena,
  usarCambioDeContrasena,
  usarQuitarDocumento,
} from './usar-acciones-de-contrasena';

/** La ficha de una contraseña y sus acciones (cambiar fecha, agregar, quitar, anular); cada acción recarga la ficha. */
export function usarFichaDeContrasena(id: () => string) {
  const {
    datos: ficha,
    cargando,
    cargar,
  } = usarCarga<FichaDeContrasena | null>(() => apiContrasenas.obtener(id()), null, 'No se pudo cargar la contraseña.');
  watch(id, cargar);
  return {
    ficha,
    cargando,
    cambio: usarCambioDeContrasena(ficha, cargar),
    agregar: usarAgregarDocumentos(ficha, cargar),
    quitar: usarQuitarDocumento(ficha, id, cargar),
    anular: usarAnularContrasena(ficha, id, cargar),
  };
}
