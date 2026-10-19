import { ref } from 'vue';
import { usarAvisos } from '../almacenes/avisos';
import { ErrorApi } from '../servicios/cliente-http';

/** Los errores repartidos por campo: los de validación, o el campo que señala un conflicto; `null` si no hay. */
function erroresPorCampo(error: unknown): Record<string, string> | null {
  if (!(error instanceof ErrorApi)) return null;
  if (error.erroresCampos.length > 0) {
    return Object.fromEntries(error.erroresCampos.map((e) => [e.campo, e.mensaje]));
  }
  return error.campoDelConflicto ? { [error.campoDelConflicto]: error.message } : null;
}

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
      const porCampo = erroresPorCampo(error);
      if (porCampo) errores.value = porCampo;
      const esDeValidacion = error instanceof ErrorApi && error.erroresCampos.length > 0;
      // Un conflicto que señala un campo (p. ej. una vigencia en uso) marca el campo y además avisa.
      if (!esDeValidacion) {
        avisos.error(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
      }
      return false;
    } finally {
      enviando.value = false;
    }
  }

  return { enviando, errores, enviar };
}
