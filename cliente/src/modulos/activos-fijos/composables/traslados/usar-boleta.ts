import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiTraslados, type Boleta } from '../../servicios/traslados.api';
import { numeroDeBoleta } from './edicion-de-traslado';
import { usarAnulacionDeTraslado } from './usar-anulacion-de-traslado';

/** La boleta de un traslado para verla, imprimirla (`imprimir`) o anularla. */
export function usarBoleta(grupoId: string) {
  const {
    datos: boleta,
    cargando,
    cargar,
  } = usarCarga(() => apiTraslados.boleta(grupoId), null as Boleta | null, 'No se pudo cargar la boleta.');
  const anulacion = usarAnulacionDeTraslado(cargar);
  const numero = computed(() => (boleta.value ? numeroDeBoleta(boleta.value.numero, boleta.value.anioDeNumero) : ''));
  return { boleta, cargando, numero, anulacion, imprimir: (): void => window.print() };
}
