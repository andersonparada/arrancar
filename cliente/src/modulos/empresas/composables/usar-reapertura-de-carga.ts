import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDatosDeEmpresa, type CargaInicial } from '../servicios/datos-de-empresa.api';

/** La ventana que pide el motivo: se abre vacía y sin errores viejos. */
function usarVentanaDelMotivo(alAbrir: () => void) {
  const reaperturaAbierta = ref(false);
  const motivo = ref('');

  function abrirReapertura(): void {
    motivo.value = '';
    alAbrir();
    reaperturaAbierta.value = true;
  }

  return { reaperturaAbierta, motivo, abrirReapertura };
}

/** Reabrir la carga inicial de la empresa que se edita: pide el motivo en una ventana y lo manda al servidor. */
export function usarReaperturaDeCarga(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDelMotivo(() => (errores.value = {}));

  async function reabrir(): Promise<void> {
    const id = empresaId();
    if (!id) return;
    const reabrirConMotivo = async () =>
      (carga.value = await apiDatosDeEmpresa.reabrirCargaInicial(id, ventana.motivo.value));
    if (!(await enviar(reabrirConMotivo))) return;
    ventana.reaperturaAbierta.value = false;
    avisos.exito('Carga inicial reabierta. Quedó registrada en la auditoría.');
  }

  return { enviandoReapertura: enviando, erroresDeReapertura: errores, ...ventana, reabrir };
}
