import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiTiposDeLocalidad, type TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';

/** Lo que se puede elegir en los selectores de la ventana de la localidad. */
export function usarReferenciasDeLocalidad() {
  const { datos: tiposDeLocalidad } = usarCarga(
    () => apiTiposDeLocalidad.listar(),
    [] as TipoDeLocalidad[],
    'No se pudieron cargar los tipos de localidad.',
  );
  return computed(() => ({
    tipoId: opcionesDeRegistros(tiposDeLocalidad.value, (tipoDeLocalidad) => String(tipoDeLocalidad.nombre), true),
  }));
}
