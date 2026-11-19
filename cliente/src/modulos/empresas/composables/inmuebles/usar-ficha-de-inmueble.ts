import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiInmuebles, type Inmueble } from '../../servicios/inmuebles.api';
import { usarBajaDeInmueble } from './usar-baja-de-inmueble';

/** La ficha del inmueble: sus datos y lo que puede hacer con el inmueble quien lo gestiona. */
export function usarFichaDeInmueble(inmuebleId: string) {
  const router = useRouter();
  const {
    datos: registro,
    cargando,
    cargar,
  } = usarCarga(() => apiInmuebles.obtener(inmuebleId), null as Inmueble | null, 'No se pudo cargar el inmueble.');
  const editar = () => router.push({ name: 'empresas.inmuebles.editar', params: { inmuebleId } });

  return { registro, cargando, editar, ...usarBajaDeInmueble(registro, cargar) };
}
