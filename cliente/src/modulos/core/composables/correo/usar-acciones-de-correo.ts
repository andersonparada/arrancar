import { computed, ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarFormulario } from '../usar-formulario';

interface OpcionesDeCancelacion {
  /** Cancela el correo (cada pantalla llama a su ruta: la del historial o la del aviso del pago). */
  cancelar: (correoId: string, motivo: string) => Promise<unknown>;
  /** Qué hacer al terminar: recargar la lista o la ficha. */
  alTerminar: () => Promise<void> | void;
}

/** Qué correo se va a cancelar y el motivo que se escribe; la ventana está abierta mientras haya un correo. */
function usarVentanaDeMotivo(limpiarErrores: () => void) {
  const correoId = ref<string | null>(null);
  const motivo = ref('');
  const cerrar = () => (correoId.value = null);

  function abrir(id: string): void {
    motivo.value = '';
    limpiarErrores();
    correoId.value = id;
  }

  return { correoId, motivo, abierta: computed(() => correoId.value !== null), abrir, cerrar };
}

/**
 * La ventana que pide el motivo antes de cancelar un correo pendiente. El motivo (de 1 a 300 caracteres) queda en la
 * auditoría; el servidor lo valida y su error sale en el campo.
 */
export function usarCancelacionDeCorreo({ cancelar, alTerminar }: OpcionesDeCancelacion) {
  const avisos = usarAvisos();
  const formulario = usarFormulario();
  const ventana = usarVentanaDeMotivo(() => (formulario.errores.value = {}));

  async function confirmar(): Promise<void> {
    const id = ventana.correoId.value;
    if (!id) return;
    if (!(await formulario.enviar(() => cancelar(id, ventana.motivo.value.trim())))) return;
    avisos.exito('Envío cancelado.');
    ventana.cerrar();
    await alTerminar();
  }

  return { ...ventana, errores: formulario.errores, enviando: formulario.enviando, confirmar };
}

/** Pide confirmación y manda otra vez un correo que falló. */
export function usarReintentoDeCorreo(
  reintentar: (correoId: string) => Promise<unknown>,
  alTerminar: () => Promise<void> | void,
) {
  const avisos = usarAvisos();
  const formulario = usarFormulario();

  async function pedir(correoId: string): Promise<void> {
    const acepta = await avisos.confirmar({
      titulo: 'Reintentar envío',
      mensaje: 'El correo vuelve a la bandeja y se intentará enviar de nuevo. Cuenta otra vez en los topes de envío.',
      textoConfirmar: 'Reintentar',
    });
    if (!acepta) return;
    if (!(await formulario.enviar(() => reintentar(correoId)))) return;
    avisos.exito('El correo volvió a la bandeja.');
    await alTerminar();
  }

  return { reintentando: formulario.enviando, pedir };
}
