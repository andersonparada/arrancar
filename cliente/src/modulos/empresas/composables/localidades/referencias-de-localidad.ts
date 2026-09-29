import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarGeografia, type Ubicacion } from '@/modulos/core/composables/usar-geografia';
import { apiTiposDeLocalidad, type TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';
import { opcionesDeGeografia, opcionesDeTipos } from './opciones-de-localidad';
import type { Ref } from 'vue';

/** Lo que se puede elegir en los selectores de la localidad: tipos activos, departamentos y municipios. */
export function usarReferenciasDeLocalidad(edicion: Ref<Ubicacion & { tipoId: string | null }>) {
  const { datos: tipos } = usarCarga(
    () => apiTiposDeLocalidad.listar(),
    [] as TipoDeLocalidad[],
    'No se pudieron cargar los tipos de localidad.',
  );
  const { departamentos, municipios } = usarGeografia(edicion);
  return computed(() => ({
    tipoId: opcionesDeTipos(tipos.value, edicion.value.tipoId),
    departamentoCodigo: opcionesDeGeografia(departamentos.value),
    municipioCodigo: opcionesDeGeografia(municipios.value),
  }));
}
