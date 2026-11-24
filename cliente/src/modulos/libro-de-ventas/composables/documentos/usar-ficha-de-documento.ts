import { computed, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiDocumentos, type FichaDeDocumento } from '../../servicios/documentos.api';

/**
 * La ficha de un documento. Se vuelve a cargar si cambia el documento de la ruta (de una factura a una de sus
 * notas), y `reemplazar` la actualiza con la respuesta de una acción (p. ej. anular).
 */
export function usarFichaDeDocumento(idDelDocumento: () => string) {
  const { datos, cargando, cargar } = usarCarga<FichaDeDocumento | null>(
    () => apiDocumentos.obtener(idDelDocumento()),
    null,
    'No se pudo cargar el documento.',
  );
  watch(idDelDocumento, cargar);
  const reemplazar = (ficha: FichaDeDocumento) => (datos.value = ficha);

  return { ficha: computed(() => datos.value), cargando, reemplazar };
}
