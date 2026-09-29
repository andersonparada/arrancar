import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';

/** Lo que se puede elegir en los selectores de la ventana del departamento. */
export function usarReferenciasDeDepartamento() {
  const { datos: localidades } = usarCarga(
    () => apiLocalidades.listar(),
    [] as Localidad[],
    'No se pudieron cargar las localidades.',
  );
  return computed(() => ({
    localidadId: opcionesDeRegistros(localidades.value, (localidad) => String(localidad.nombre), false),
  }));
}
