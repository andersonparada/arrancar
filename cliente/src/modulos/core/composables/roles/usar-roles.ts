import { computed } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiRoles, type Rol } from '../../servicios/roles.api';
import { usarCarga } from '../usar-carga';
import { usarFormulario } from '../usar-formulario';

const rolesYPermisos = () => Promise.all([apiRoles.listar(), apiRoles.catalogoPermisos()]);

/** Pide confirmación antes de borrar: un rol eliminado no se recupera. */
const confirmarEliminacion = (avisos: ReturnType<typeof usarAvisos>, rol: Rol) =>
  avisos.confirmar({
    titulo: 'Eliminar rol',
    mensaje: `¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`,
    textoConfirmar: 'Eliminar',
    peligroso: true,
  });

/** Los roles de la cuenta, el catálogo de permisos que pueden llevar y su eliminación. */
export function usarRoles() {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { datos, cargar } = usarCarga(rolesYPermisos, [[], []], 'No se pudieron cargar los roles.');

  async function eliminar(rol: Rol): Promise<void> {
    if (!(await confirmarEliminacion(avisos, rol))) return;
    if (!(await enviar(() => apiRoles.eliminar(rol.id)))) return;
    avisos.exito('Rol eliminado.');
    await cargar();
  }

  return { roles: computed(() => datos.value[0]), catalogo: computed(() => datos.value[1]), cargar, eliminar };
}
