import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiDepreciacion, type EstadoDeDepreciacion } from '../../servicios/depreciacion.api';
import { cierresRecientesPrimero, mesReabrible } from './logica-de-cierre';
import { usarReaperturaDeMes } from './usar-reapertura-de-mes';
import { usarRevisionDeCierre } from './usar-revision-de-cierre';

const SIN_CIERRES: EstadoDeDepreciacion = { siguienteMes: null, cierres: [] };

/** La pantalla del cierre de depreciación: el mes por cerrar, los meses cerrados, revisar y cerrar, y reabrir. */
export function usarCierreDeDepreciacion() {
  const {
    datos: estado,
    cargando,
    cargar,
  } = usarCarga(() => apiDepreciacion.estado(), SIN_CIERRES, 'No se pudo cargar el cierre de depreciación.');
  const cierres = computed(() => cierresRecientesPrimero(estado.value.cierres));
  const reabrible = computed(() => mesReabrible(estado.value.cierres));
  const revision = usarRevisionDeCierre(cargar);
  const reapertura = usarReaperturaDeMes(cargar);

  return { estado, cierres, reabrible, cargando, revision, reapertura };
}
