import { computed, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';
import { opcionesDeLocalidades } from './opciones-de-departamento';

/** Lo que se puede elegir en los selectores de la ventana del departamento: localidades activas que el usuario ve. */
export function usarReferenciasDeDepartamento(localidadActual: Ref<string | null>) {
  const { datos: localidades } = usarCarga(
    () => apiLocalidades.listar(),
    [] as Localidad[],
    'No se pudieron cargar las localidades.',
  );
  return computed(() => ({ localidadId: opcionesDeLocalidades(localidades.value, localidadActual.value) }));
}
