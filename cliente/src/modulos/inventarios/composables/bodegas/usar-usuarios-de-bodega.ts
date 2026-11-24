import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiAccesosABodegas, type UsuarioConAcceso } from '../../servicios/accesos-a-bodegas.api';

/** Los usuarios con acceso a una bodega; solo se piden si quien mira puede asignar. */
export function usarUsuariosDeBodega(bodegaId: string) {
  const sesion = usarSesion();
  return usarCarga(
    async () => (sesion.puede('inventarios.bodegas.asignar') ? apiAccesosABodegas.usuariosDeBodega(bodegaId) : []),
    [] as UsuarioConAcceso[],
    'No se pudieron cargar los usuarios con acceso.',
  );
}
