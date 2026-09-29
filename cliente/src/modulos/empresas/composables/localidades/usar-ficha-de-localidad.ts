import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';

/** La ficha de la localidad: sus datos y lo que puede hacer con la localidad quien la gestiona. */
export function usarFichaDeLocalidad(localidadId: string) {
  const router = useRouter();
  const { datos: registro, cargando } = usarCarga(
    () => apiLocalidades.obtener(localidadId),
    null as Localidad | null,
    'No se pudo cargar la localidad.',
  );
  const editar = () => router.push({ name: 'empresas.localidades.editar', params: { localidadId } });

  return { registro, cargando, editar };
}
