import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiPagos, type FichaDePago } from '../../servicios/pagos.api';
import { watch } from 'vue';
import { usarAnulacionDePago, usarSaldarDiferencia } from './usar-acciones-del-pago';
import { usarReaplicacionDePago } from './usar-reaplicacion-de-pago';

/** La ficha de un pago y sus acciones (anular, reaplicar, saldar una diferencia); cada acción recarga la ficha. */
export function usarFichaDePago(id: () => string) {
  const {
    datos: ficha,
    cargando,
    cargar,
  } = usarCarga<FichaDePago | null>(() => apiPagos.obtener(id()), null, 'No se pudo cargar el pago.');
  watch(id, cargar);
  return {
    ficha,
    cargando,
    anular: usarAnulacionDePago(ficha, cargar),
    reaplicar: usarReaplicacionDePago(ficha, cargar),
    saldar: usarSaldarDiferencia(ficha, cargar),
  };
}
