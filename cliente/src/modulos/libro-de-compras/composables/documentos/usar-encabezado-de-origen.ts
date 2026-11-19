import { computed, reactive, type Ref } from 'vue';
import { useRoute, type RouteLocationRaw } from 'vue-router';
import { FORMULARIO_DE_DOCUMENTO } from '../../textos-del-registro';
import { referenciaDeLaRuta } from './referencia-de-destino';

type Enlace = { texto: string; ruta: RouteLocationRaw };

/**
 * El encabezado de Ingreso de facturas según de dónde se llegó: desde un destino (un fondo, un anticipo) dice a dónde
 * va el documento y vuelve a él; si no, es el de siempre.
 */
export function usarEncabezadoDeOrigen(volverDeSiempre: Ref<Enlace>) {
  const origen = referenciaDeLaRuta(useRoute().query);
  const { descripcion, volverAlDestino, paraElDestino } = FORMULARIO_DE_DOCUMENTO;
  return reactive({
    descripcion: computed(() => (origen.etiqueta ? paraElDestino(origen.etiqueta) : descripcion)),
    volver: computed(() => (origen.volver ? { texto: volverAlDestino, ruta: origen.volver } : volverDeSiempre.value)),
  });
}
