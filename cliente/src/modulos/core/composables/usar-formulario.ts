import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '../almacenes/avisos';
import { ErrorApi } from '../servicios/cliente-http';

/** Los mismos errores sin el de `campo`; si ese campo no tiene error, devuelve el mismo objeto. */
export function sinErrorDe(errores: Record<string, string>, campo: string): Record<string, string> {
  if (!(campo in errores)) return errores;
  const resto = { ...errores };
  delete resto[campo];
  return resto;
}

/** Los errores repartidos por campo: los de validación, o el campo que señala un conflicto; `null` si no hay. */
function erroresPorCampo(error: unknown): Record<string, string> | null {
  if (!(error instanceof ErrorApi)) return null;
  if (error.erroresCampos.length > 0) {
    return Object.fromEntries(error.erroresCampos.map((e) => [e.campo, e.mensaje]));
  }
  return error.campoDelConflicto ? { [error.campoDelConflicto]: error.message } : null;
}

/** Quita el error de `campo` en cuanto cambia lo que devuelve `valor`: el usuario ya lo está corrigiendo. */
export function quitarErrorAlCambiar(errores: Ref<Record<string, string>>, campo: string, valor: () => unknown): void {
  watch(valor, () => (errores.value = sinErrorDe(errores.value, campo)));
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
