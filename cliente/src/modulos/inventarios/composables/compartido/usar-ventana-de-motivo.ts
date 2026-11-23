import { ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { faltaElMotivo, motivoVacio } from './motivo';

/**
 * Una ventana que pide el motivo de una acción (anular, descartar): revisa que haya motivo, ejecuta la acción con él
 * y, si el servidor la acepta, cierra la ventana y avisa con `alTerminar`.
 */
export function usarVentanaDeMotivo(
  ejecutar: (motivo: string) => Promise<unknown>,
  alTerminar: () => Promise<void> | void,
) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(motivoVacio());

  function abrir(): void {
    errores.value = {};
    edicion.value = { abierta: true, motivo: '' };
  }

  async function guardar(): Promise<void> {
    errores.value = faltaElMotivo(edicion.value);
    if (Object.keys(errores.value).length) return;
    if (!(await enviar(() => ejecutar(edicion.value.motivo.trim())))) return;
    edicion.value.abierta = false;
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}
