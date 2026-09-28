import { reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import type { Movimiento } from '../../servicios/movimientos.api';
import { apiNotas } from '../../servicios/notas.api';
import {
  filtroDeLaConsulta,
  filtrosPorOmision,
  type FiltrosDeMovimientos,
} from '../movimientos/filtros-de-movimientos';

/** Las notas de la empresa, filtradas por cuenta y fechas; recarga sola al cambiar el filtro. */
export function usarListaDeNotas() {
  const filtros = reactive<FiltrosDeMovimientos>(filtrosPorOmision());
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiNotas.listar(filtroDeLaConsulta(filtros)),
    [] as Movimiento[],
    'No se pudieron cargar las notas.',
  );
  watch(filtros, cargar);

  return { registros, cargando, cargar, filtros };
}
