import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiAccesosALocalidades, type UsuarioConAcceso } from '../../servicios/accesos-a-localidades.api';

/** Los usuarios con acceso a una localidad; solo se piden si quien mira puede asignar. */
export function usarUsuariosDeLocalidad(localidadId: string) {
  const sesion = usarSesion();
  return usarCarga(
    async () =>
      sesion.puede('empresas.localidades.asignar') ? apiAccesosALocalidades.usuariosDeLocalidad(localidadId) : [],
    [] as UsuarioConAcceso[],
    'No se pudieron cargar los usuarios con acceso.',
  );
}
