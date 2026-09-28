import { reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';
import { filtroDeLaConsulta, filtrosPorOmision, type FiltrosDeMovimientos } from './filtros-de-movimientos';

/** La cuenta con la que arranca la lista si llegó por la ruta (`?cuenta=<id>`). */
function cuentaDeLaRuta(): string | null {
  const { cuenta } = useRoute().query;
  return typeof cuenta === 'string' ? cuenta : null;
}

/** Los movimientos de la empresa, filtrados por cuenta y fechas; recarga sola al cambiar el filtro. */
export function usarListaDeMovimientos() {
  const filtros = reactive<FiltrosDeMovimientos>(filtrosPorOmision(cuentaDeLaRuta()));
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiMovimientos.listar(filtroDeLaConsulta(filtros)),
    [] as Movimiento[],
    'No se pudieron cargar los movimientos.',
  );
  watch(filtros, cargar);

  return { registros, cargando, cargar, filtros };
}
