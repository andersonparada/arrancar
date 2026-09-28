import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTransferencias } from '../../servicios/transferencias.api';
import { datosDeTransferencia, edicionDe, type EdicionDeTransferencia } from './edicion-de-transferencia';

/** La ventana de registrar una transferencia entre cuentas propias: abrirla y guardarla. */
export function usarFormularioDeTransferencia(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeTransferencia>({ ...edicionDe(), abierta: false });

  function nueva(): void {
    edicion.value = edicionDe();
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    if (!(await enviar(() => apiTransferencias.crear(datosDeTransferencia(edicion.value))))) return;
    avisos.exito('Transferencia registrada.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, nueva, guardar };
}
