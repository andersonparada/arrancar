import { computed, reactive } from 'vue';
import { usarSesion } from '../../almacenes/sesion';
import { usarAvisos } from '../../almacenes/avisos';
import { apiUsuarios, type Usuario } from '../../servicios/usuarios.api';
import { usarFormulario } from '../usar-formulario';

/** La ventana para darle una contraseña nueva a un usuario (quien cambia la suya escribe la actual); cierra sus sesiones abiertas. */
export function usarCambioDeContrasena() {
  const avisos = usarAvisos();
  const sesion = usarSesion();
  const { enviando, errores, enviar } = usarFormulario();
  const cambio = reactive({ abierta: false, usuario: null as Usuario | null, contrasena: '', contrasenaActual: '' });
  const esLaPropia = computed(() => cambio.usuario !== null && cambio.usuario.id === sesion.usuario?.id);

  function abrir(usuario: Usuario): void {
    Object.assign(cambio, { abierta: true, usuario, contrasena: '', contrasenaActual: '' });
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const usuario = cambio.usuario;
    const actual = esLaPropia.value ? cambio.contrasenaActual : undefined;
    if (!usuario || !(await enviar(() => apiUsuarios.cambiarContrasena(usuario.id, cambio.contrasena, actual)))) return;
    avisos.exito('Contraseña cambiada. El usuario deberá volver a iniciar sesión.');
    cambio.abierta = false;
  }

  return { cambio, esLaPropia, enviando, errores, abrir, guardar };
}
