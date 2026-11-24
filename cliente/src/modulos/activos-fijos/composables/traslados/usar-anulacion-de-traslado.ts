import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { apiTraslados } from '../../servicios/traslados.api';
import { numeroDeBoleta } from './edicion-de-traslado';

/** La boleta que se quiere anular: lo mínimo para decirlo en la ventana. */
export interface BoletaPorAnular {
  grupoId: string;
  numero: number;
  anioDeNumero: number;
  fecha: string;
}

/** Lo que pasará al anular una boleta, para la confirmación. */
export function mensajeDeAnulacionDeBoleta(boleta: BoletaPorAnular): string {
  return (
    `Se anula la boleta ${numeroDeBoleta(boleta.numero, boleta.anioDeNumero)} del ${formatearFecha(boleta.fecha)} ` +
    'con todos sus activos: cada uno vuelve a su ubicación anterior. Solo se puede si es el último traslado de ' +
    'cada activo y el mes está abierto. La boleta anulada queda en el historial con su motivo.'
  );
}

/** La ventana de motivo para anular una boleta de traslado; `alAnular` recarga lo que se ve. */
export function usarAnulacionDeTraslado(alAnular: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const boleta = ref<BoletaPorAnular | null>(null);
  const motivo = ref('');
  const texto = computed(() => (boleta.value ? mensajeDeAnulacionDeBoleta(boleta.value) : ''));

  function pedir(porAnular: BoletaPorAnular): void {
    motivo.value = '';
    errores.value = {};
    boleta.value = porAnular;
  }

  async function confirmar(): Promise<void> {
    const actual = boleta.value;
    if (!actual || !(await enviar(() => apiTraslados.anular(actual.grupoId, motivo.value.trim())))) return;
    boleta.value = null;
    avisos.exito('Boleta anulada. Los activos volvieron a su ubicación anterior.');
    await alAnular();
  }

  return { boleta, motivo, texto, enviando, errores, pedir, confirmar, cerrar: () => (boleta.value = null) };
}
