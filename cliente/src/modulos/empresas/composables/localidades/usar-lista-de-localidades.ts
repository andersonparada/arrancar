import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';

/** Las localidades de la empresa para la lista; cada una lleva a su ficha. */
export function usarListaDeLocalidades() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiLocalidades.listar(), [] as Localidad[], 'No se pudieron cargar las localidades.');
  return { registros, cargando, intercambio: usarIntercambio(apiLocalidades.intercambio, cargar) };
}
