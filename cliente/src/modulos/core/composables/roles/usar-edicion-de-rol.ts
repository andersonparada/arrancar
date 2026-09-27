import { ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiRoles, type Rol } from '../../servicios/roles.api';
import { usarFormulario } from '../usar-formulario';
import { datosDelRol, edicionDe, type EdicionDeRol } from './edicion-de-rol';

const guardarRol = (edicion: EdicionDeRol) =>
  edicion.rolId ? apiRoles.actualizar(edicion.rolId, datosDelRol(edicion)) : apiRoles.crear(datosDelRol(edicion));

/** La ventana de alta y edición de roles con sus permisos. */
export function usarEdicionDeRol(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeRol>({ ...edicionDe(), abierta: false });

  function abrir(rol?: Rol): void {
    edicion.value = edicionDe(rol);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    if (!(await enviar(() => guardarRol(edicion.value)))) return;
    avisos.exito('Rol guardado.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}
