import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';

/** Reabrir la carga inicial de la empresa que se edita: pide el motivo en una ventana y lo manda al servidor. */
export function usarReaperturaDeCarga(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const motivo = ref('');

  async function reabrir(): Promise<void> {
    const id = empresaId();
    if (!id) return;
    const reabrirConMotivo = async () => (carga.value = await apiDatosDeEmpresa.reabrirCargaInicial(id, motivo.value));
    if (!(await enviar(reabrirConMotivo))) return;
    abierta.value = false;
    avisos.exito('Carga inicial reabierta. Quedó registrada en la auditoría.');
  }

  return {
    abierta,
    motivo,
    enviando,
    errores,
    reabrir,
    abrir: () => ([motivo.value, errores.value, abierta.value] = ['', {}, true]),
    cancelar: () => (abierta.value = false),
    fijarMotivo: (texto: string) => (motivo.value = texto),
  };
}
