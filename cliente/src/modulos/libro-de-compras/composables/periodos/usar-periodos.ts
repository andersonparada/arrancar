import { computed, ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiPeriodos, type PeriodosDelAnio } from '../../servicios/periodos.api';
import { opcionesDeAnio } from '../retenciones/datos-de-pagos';
import { usarControlDePeriodos } from './usar-control-de-periodos';

/** Los doce meses del año escogido, con el bloqueo de períodos declarados; al cambiar de año se vuelven a pedir. */
export function usarPeriodos() {
  const anio = ref(new Date().getFullYear());
  const {
    datos: vista,
    cargando,
    cargar,
  } = usarCarga<PeriodosDelAnio | null>(
    () => apiPeriodos.lista(anio.value),
    null,
    'No se pudieron cargar los períodos.',
  );
  watch(anio, cargar);

  return {
    anio,
    vista,
    cargando,
    opcionesDeAnio: computed(() => opcionesDeAnio(new Date(), anio.value)),
    control: usarControlDePeriodos(cargar),
  };
}
