import { computed, ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import { apiFondos } from '../../servicios/fondos.api';
import type { Fondo } from '../../servicios/tipos-de-fondos';
import type {
  ComprobanteDeLaBandeja,
  EstadoDeLosComprobantes,
  ListaDeComprobantes,
} from '../../servicios/tipos-de-comprobantes';
import { usarMovimientosDelFondo } from '../movimientos/usar-movimientos-del-fondo';
import { detallesDeLaFicha, partesDeLaEcuacion } from './detalles-de-fondo';

const SIN_COMPROBANTES: ListaDeComprobantes = { elementos: [], totales: { pendiente: '0.00', repuesto: '0.00' } };

/** Las tres lecturas de la ficha: el fondo, sus comprobantes según el estado elegido y las facturas con retención en la bandeja. */
function cargasDeLaFicha(id: string, estado: () => EstadoDeLosComprobantes) {
  return {
    fondo: usarCarga(() => apiFondos.obtener(id), null as Fondo | null, 'No se pudo cargar el fondo.'),
    comprobantes: usarCarga(
      () => apiComprobantes.delFondo(id, estado()),
      SIN_COMPROBANTES,
      'No se pudieron cargar los comprobantes.',
    ),
    conRetencion: usarCarga(
      () => apiComprobantes.bandeja({ conRetencion: true }),
      [] as ComprobanteDeLaBandeja[],
      'No se pudo cargar la bandeja.',
    ),
  };
}

/**
 * La ficha de un fondo: el fondo con su historial, sus comprobantes (pendientes por omisión) y las facturas con retención
 * que esperan en la bandeja para asignarlas con la excepción.
 */
export function usarFichaDelFondo(id: string) {
  const estado = ref<EstadoDeLosComprobantes>('pendiente');
  const { fondo, comprobantes, conRetencion } = cargasDeLaFicha(id, () => estado.value);
  watch(estado, comprobantes.cargar);
  const movimientos = usarMovimientosDelFondo(id);

  return {
    movimientos,
    estado,
    fondo: fondo.datos,
    cargando: computed(() => fondo.cargando.value && !fondo.datos.value),
    comprobantes: comprobantes.datos,
    cargandoComprobantes: comprobantes.cargando,
    conRetencion: conRetencion.datos,
    ecuacion: computed(() => (fondo.datos.value ? partesDeLaEcuacion(fondo.datos.value) : [])),
    detalles: computed(() => (fondo.datos.value ? detallesDeLaFicha(fondo.datos.value) : [])),
    recargar: () => Promise.all([fondo.cargar(), comprobantes.cargar(), conRetencion.cargar(), movimientos.recargar()]),
  };
}
