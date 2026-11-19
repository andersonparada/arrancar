import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiActivos, type ActivoFicha } from '../../servicios/activos.api';
import { detallesDeFicha } from './detalles-de-activo';
import { etiquetasDeActivo } from './etiquetas-de-activo';

/** La ficha del activo: sus datos con formato, sus etiquetas y el historial de ubicación. */
export function usarFichaDeActivo(activoId: string) {
  const { datos: registro, cargando } = usarCarga(
    () => apiActivos.obtener(activoId),
    null as ActivoFicha | null,
    'No se pudo cargar el activo.',
  );
  const detalles = computed(() => (registro.value ? detallesDeFicha(registro.value) : []));
  const etiquetas = computed(() => (registro.value ? etiquetasDeActivo(registro.value) : []));
  return { registro, cargando, detalles, etiquetas };
}
