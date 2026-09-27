import { reactive } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiUsuarios, type Usuario } from '../../servicios/usuarios.api';
import { usarFormulario } from '../usar-formulario';

/** La ventana para darle una contraseña nueva a un usuario; cierra sus sesiones abiertas. */
export function usarCambioDeContrasena() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const cambio = reactive({ abierta: false, usuario: null as Usuario | null, contrasena: '' });

  function abrir(usuario: Usuario): void {
    Object.assign(cambio, { abierta: true, usuario, contrasena: '' });
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const usuario = cambio.usuario;
    if (!usuario || !(await enviar(() => apiUsuarios.cambiarContrasena(usuario.id, cambio.contrasena)))) return;
    avisos.exito('Contraseña cambiada. El usuario deberá volver a iniciar sesión.');
    cambio.abierta = false;
  }

  return { cambio, enviando, errores, abrir, guardar };
}
