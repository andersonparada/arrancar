import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones, type Conciliacion } from '../../servicios/conciliaciones.api';

/** Devuelve una conciliación elaborada a en proceso, en su propia ventana; pide el motivo. */
export function usarDevolucionDeConciliacion(conciliacion: Ref<Conciliacion | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const motivo = ref('');

  function abrir(): void {
    motivo.value = '';
    errores.value = {};
    abierta.value = true;
  }

  const cerrar = (): void => void (abierta.value = false);

  async function confirmar(): Promise<void> {
    const id = conciliacion.value?.id;
    if (!id) return;
    if (!(await enviar(async () => (conciliacion.value = await apiConciliaciones.devolver(id, motivo.value))))) return;
    avisos.exito('Conciliación devuelta: vuelve a estar en proceso.');
    cerrar();
  }

  return { abierta, motivo, enviando, errores, abrir, cerrar, confirmar };
}
