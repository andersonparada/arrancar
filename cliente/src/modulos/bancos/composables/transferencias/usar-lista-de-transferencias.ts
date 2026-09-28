import { reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiTransferencias, type Transferencia } from '../../servicios/transferencias.api';
import {
  filtroDeLaConsulta,
  filtrosPorOmision,
  type FiltrosDeMovimientos,
} from '../movimientos/filtros-de-movimientos';

/** Las transferencias de la empresa, filtradas por cuenta (origen o destino) y fechas; recarga sola al cambiar el filtro. */
export function usarListaDeTransferencias() {
  const filtros = reactive<FiltrosDeMovimientos>(filtrosPorOmision());
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiTransferencias.listar(filtroDeLaConsulta(filtros)),
    [] as Transferencia[],
    'No se pudieron cargar las transferencias.',
  );
  watch(filtros, cargar);

  return { registros, cargando, cargar, filtros };
}
