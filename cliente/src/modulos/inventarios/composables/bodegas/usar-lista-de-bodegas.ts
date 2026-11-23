import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiBodegas, type Bodega } from '../../servicios/bodegas.api';

/** Las bodegas de la empresa para la lista; cada una lleva a su ficha. */
export function usarListaDeBodegas() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiBodegas.listar(), [] as Bodega[], 'No se pudieron cargar las bodegas.');
  return { registros, cargando, intercambio: usarIntercambio(apiBodegas.intercambio, cargar) };
}
