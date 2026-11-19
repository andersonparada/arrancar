import { computed, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarGeografia } from '@/modulos/core/composables/usar-geografia';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';
import { opcionesDeGeografia } from '../localidades/opciones-de-localidad';
import type { EdicionDeInmueble } from './edicion-de-inmueble';

/** Lo que se puede elegir en los selectores del inmueble: la localidad, los departamentos y los municipios. */
export function usarReferenciasDeInmueble(edicion: Ref<EdicionDeInmueble>) {
  const { datos: localidades } = usarCarga(
    () => apiLocalidades.listar(),
    [] as Localidad[],
    'No se pudieron cargar las localidades.',
  );
  const { departamentos, municipios } = usarGeografia(edicion);
  return computed(() => ({
    localidadId: opcionesDeRegistros(localidades.value, (localidad) => String(localidad.nombre), true),
    departamentoRegistral: opcionesDeGeografia(departamentos.value),
    departamentoCodigo: opcionesDeGeografia(departamentos.value),
    municipioCodigo: opcionesDeGeografia(municipios.value),
  }));
}
