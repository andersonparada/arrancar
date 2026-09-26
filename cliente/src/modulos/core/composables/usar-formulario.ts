import { ref } from 'vue';
import { usarAvisos } from '../almacenes/avisos';
import { ErrorApi } from '../servicios/cliente-http';

/**
 * Maneja el envío de un formulario: estado de carga, errores por campo que
 * devuelve la API y aviso de error general.
 */
export function usarFormulario() {
  const avisos = usarAvisos();
  const enviando = ref(false);
  const errores = ref<Record<string, string>>({});

  /**
   * Ejecuta `accion` y reparte los errores de validación entre los campos.
   * @returns `true` si la acción terminó sin errores.
   */
  async function enviar(accion: () => Promise<unknown>): Promise<boolean> {
    enviando.value = true;
    errores.value = {};
    try {
      await accion();
      return true;
    } catch (error) {
      if (error instanceof ErrorApi && error.erroresCampos.length > 0) {
        errores.value = Object.fromEntries(error.erroresCampos.map((e) => [e.campo, e.mensaje]));
      } else {
        avisos.error(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
      }
      return false;
    } finally {
      enviando.value = false;
    }
  }

  return { enviando, errores, enviar };
}
