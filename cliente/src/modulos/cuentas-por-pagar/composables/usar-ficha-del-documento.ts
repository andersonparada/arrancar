import { watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentasPorPagar, type FichaDelDocumento } from '../servicios/cuentas-por-pagar.api';

/** Lee la ficha de un documento y la vuelve a leer si cambia el documento o después de una acción (`cargar`). */
export function usarFichaDelDocumento(documentoId: () => string) {
  const carga = usarCarga<FichaDelDocumento | null>(
    () => apiCuentasPorPagar.obtener(documentoId()),
    null,
    'No se pudo cargar el documento.',
  );
  watch(documentoId, carga.cargar);
  return carga;
}
