import { computed } from 'vue';
import { apiRoles } from '../../servicios/roles.api';
import { apiUsuarios } from '../../servicios/usuarios.api';
import { usarCarga } from '../usar-carga';

const usuariosYRoles = () => Promise.all([apiUsuarios.listar(), apiRoles.listar()]);

/** Los usuarios de la cuenta y los roles que se les pueden dar. */
export function usarUsuarios() {
  const { datos, cargando, cargar } = usarCarga(usuariosYRoles, [[], []], 'No se pudieron cargar los usuarios.');
  const usuarios = computed(() => datos.value[0]);
  const roles = computed(() => datos.value[1]);
  return { usuarios, roles, cargando, cargar };
}
