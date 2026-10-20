import { ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';

/** Una ventana que pide un motivo: abre con el formulario limpio y deja enviar con errores por campo. */
export function usarVentanaConMotivo() {
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const motivo = ref('');

  function abrir(): void {
    motivo.value = '';
    errores.value = {};
    abierta.value = true;
  }

  return { abierta, motivo, enviando, errores, enviar, abrir };
}
