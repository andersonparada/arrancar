import { computed, ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiArticulos, type Articulo } from '../../servicios/articulos.api';
import { filtrarArticulos } from './reglas-de-articulo';

/** Los artículos de la empresa para la lista, con una búsqueda por código, nombre o código de barras. */
export function usarListaDeArticulos() {
  const {
    datos: todos,
    cargando,
    cargar,
  } = usarCarga(() => apiArticulos.listar(), [] as Articulo[], 'No se pudieron cargar los artículos.');
  const busqueda = ref('');
  const registros = computed(() => filtrarArticulos(todos.value, busqueda.value));
  return {
    registros,
    totalDeArticulos: computed(() => todos.value.length),
    busqueda,
    cargando,
    intercambio: usarIntercambio(apiArticulos.intercambio, cargar),
  };
}
