import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiTiposDeCambio, type EstadoDeLaCarga } from '../../servicios/tipos-de-cambio.api';

const CONSULTAS_A_MOSTRAR = 50;

/** El estado de cada serie y la bitácora reciente; puede limitarse a la moneda elegida. */
export function usarEstadoDeLaCarga(moneda: Ref<string>) {
  const avisos = usarAvisos();
  const estado = ref<EstadoDeLaCarga>({ hoy: '', series: [], consultas: [] });
  const soloDeLaMoneda = ref(false);

  async function pedirEstado(): Promise<void> {
    try {
      const deLaMoneda = soloDeLaMoneda.value ? moneda.value : undefined;
      estado.value = await apiTiposDeCambio.estadoDeLaCarga(CONSULTAS_A_MOSTRAR, deLaMoneda);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la bitácora de la carga.');
    }
  }

  watch([moneda, soloDeLaMoneda], pedirEstado);
  return { estado, soloDeLaMoneda, pedirEstado };
}
