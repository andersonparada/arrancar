import { computed, onMounted, ref, watch } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiConceptosDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { apiDocumentos, type FichaDeDocumento } from '../../servicios/documentos.api';

/**
 * Los nombres de los conceptos de gasto, para rotular las líneas. Si el usuario no puede ver el catálogo, las
 * líneas se muestran con su descripción: no es motivo para ocultar la factura (ni para pedir lo que no puede ver).
 */
function usarNombresDeConceptos() {
  const nombres = ref(new Map<string, string>());
  onMounted(async () => {
    if (!usarSesion().puede('libro-de-compras.conceptos-de-gasto.ver')) return;
    const conceptos = await apiConceptosDeGasto.listar().catch(() => []);
    nombres.value = new Map(conceptos.map(({ id, nombre }) => [id, nombre]));
  });
  return nombres;
}

/**
 * La ficha de un documento. Se vuelve a cargar si cambia el documento de la ruta (de una factura a una de sus
 * notas), y `reemplazar` la actualiza con la respuesta de una acción (p. ej. anular).
 */
export function usarFichaDeDocumento(idDelDocumento: () => string) {
  const { datos, cargando, cargar } = usarCarga<FichaDeDocumento | null>(
    () => apiDocumentos.obtener(idDelDocumento()),
    null,
    'No se pudo cargar la factura.',
  );
  watch(idDelDocumento, cargar);
  const reemplazar = (ficha: FichaDeDocumento) => (datos.value = ficha);

  return { ficha: computed(() => datos.value), cargando, conceptos: usarNombresDeConceptos(), reemplazar };
}
