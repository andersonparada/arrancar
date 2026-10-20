import { computed, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiPeriodos, type DetalleDelPeriodo } from '../../servicios/periodos.api';
import { VENTANA_DE_REAPERTURA } from '../../textos-de-periodos';
import { usarAccionConMotivo } from '../retenciones/usar-accion-con-motivo';
import { accionesDelPeriodo } from './datos-de-periodos';
import { usarDeclaracion } from './usar-declaracion';

/** Un período (`AAAA-MM`): su historial, lo que cambió desde la declaración, la revisión, y declarar y reabrir. */
export function usarDetalleDePeriodo(mes: () => string) {
  const {
    datos: detalle,
    cargando,
    cargar,
  } = usarCarga<DetalleDelPeriodo | null>(() => apiPeriodos.detalle(mes()), null, 'No se pudo cargar el período.');
  watch(mes, cargar);

  const acciones = computed(() =>
    detalle.value ? accionesDelPeriodo(detalle.value.periodo, detalle.value.control) : null,
  );

  return {
    detalle,
    cargando,
    acciones,
    declaracion: usarDeclaracion(mes, cargar),
    reapertura: usarAccionConMotivo(
      (_: true, motivo: string) => apiPeriodos.reabrir(mes(), motivo),
      cargar,
      VENTANA_DE_REAPERTURA.exito,
    ),
  };
}
