import { reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiCorrelativos,
  type ClaveDeCorrelativo,
  type FiltroDeCorrelativos,
  type ReporteDeCorrelativos,
} from '../../servicios/correlativos.api';

const REPORTE_VACIO: ReporteDeCorrelativos = { correlativos: [] };

/** Lo que se elige en el filtro: una clave o `null` para todas. */
export interface FiltrosDeCorrelativos {
  clave: ClaveDeCorrelativo | null;
}

/** Lo que se manda al servidor: solo la clave elegida filtra. */
export const filtroDeLaConsulta = ({ clave }: FiltrosDeCorrelativos): FiltroDeCorrelativos => ({
  clave: clave ?? undefined,
});

/** El reporte de correlativos: se recarga solo al cambiar la clave. */
export function usarReporteDeCorrelativos() {
  const filtros = reactive<FiltrosDeCorrelativos>({ clave: null });
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiCorrelativos.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de correlativos.',
  );
  watch(filtros, cargar);

  return { filtros, reporte, cargando, cargar };
}
