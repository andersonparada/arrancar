import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiMonedas, type MuestraDelBanguat } from '../../servicios/monedas.api';
import type { FormularioDeMoneda } from './edicion-de-moneda';
import { mensajeDeMuestra } from './lista-de-monedas';

/**
 * «Ver muestra»: trae los valores de los últimos 7 días del código elegido, sin guardarlos, para que soporte vea
 * «8.81 Q por unidad» antes de unir «Euro» con EUR. La muestra se descarta si cambia el código o se cierra la ventana.
 */
export function usarMuestraDelBanguat(edicion: Ref<FormularioDeMoneda>) {
  const avisos = usarAvisos();
  const muestra = ref<MuestraDelBanguat | null>(null);
  const cargando = ref(false);
  const resultado = computed(() => (muestra.value ? mensajeDeMuestra(muestra.value) : null));

  watch(
    () => [edicion.value.abierta, edicion.value.codigoBanguat],
    () => (muestra.value = null),
  );

  async function ver(): Promise<void> {
    const { codigoBanguat, moneda } = edicion.value;
    if (codigoBanguat === null) return;
    cargando.value = true;
    try {
      muestra.value = await apiMonedas.muestra(codigoBanguat, moneda?.codigo);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo traer la muestra del Banguat.');
    } finally {
      cargando.value = false;
    }
  }

  return reactive({ muestra, cargando, resultado, ver });
}
