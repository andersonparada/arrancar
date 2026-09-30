import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiCombustibles, type Combustible } from '../../servicios/combustibles.api';

/** Lo que se puede elegir en los selectores de la ventana de la vigencia de combustible. */
export function usarReferenciasDeVigenciaDeCombustible() {
  const { datos: combustibles } = usarCarga(
    () => apiCombustibles.listar(),
    [] as Combustible[],
    'No se pudieron cargar los combustibles.',
  );
  return computed(() => ({
    combustibleId: opcionesDeRegistros(combustibles.value, (combustible) => String(combustible.nombre), true),
  }));
}
