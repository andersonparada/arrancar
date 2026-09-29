import { computed } from 'vue';
import { apiRoles } from '../../servicios/roles.api';
import { apiUsuarios } from '../../servicios/usuarios.api';
import { usarCarga } from '../usar-carga';

/** Quien no puede ver roles igual ve a los usuarios: los roles y el catálogo llegan vacíos. */
const usuariosYRoles = () =>
  Promise.all([apiUsuarios.listar(), apiRoles.listar().catch(() => []), apiRoles.catalogoPermisos().catch(() => [])]);

/** Los usuarios de la cuenta, los roles y el catálogo de permisos que se pueden dar al crear uno. */
export function usarUsuarios() {
  const { datos, cargando, cargar } = usarCarga(
    usuariosYRoles,
    [[], [], []] as Awaited<ReturnType<typeof usuariosYRoles>>,
    'No se pudieron cargar los usuarios.',
  );
  return {
    usuarios: computed(() => datos.value[0]),
    roles: computed(() => datos.value[1]),
    catalogo: computed(() => datos.value[2]),
    cargando,
    cargar,
  };
}
