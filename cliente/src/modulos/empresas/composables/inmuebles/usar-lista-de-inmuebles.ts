import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiInmuebles, type Inmueble } from '../../servicios/inmuebles.api';

/** Los inmuebles de la empresa para la lista; cada uno lleva a su ficha. */
export function usarListaDeInmuebles() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiInmuebles.listar(), [] as Inmueble[], 'No se pudieron cargar los inmuebles.');
  return { registros, cargando, intercambio: usarIntercambio(apiInmuebles.intercambio, cargar) };
}
