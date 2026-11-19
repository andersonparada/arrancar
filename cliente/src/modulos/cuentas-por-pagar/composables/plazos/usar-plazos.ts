import { computed, ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiPlazos, type PlazoDeProveedor } from '../../servicios/plazos.api';
import { filtrarPlazos, ordenarPorProveedor } from './reglas-de-plazos';

/** Los plazos de crédito de los proveedores: la lista con su búsqueda y el Excel para cambiarlos en bloque. */
export function usarPlazos() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiPlazos.listar(), [] as PlazoDeProveedor[], 'No se pudieron cargar los plazos.');
  const busqueda = ref('');
  const todos = computed(() => ordenarPorProveedor(recibidos.value));
  const registros = computed(() => filtrarPlazos(todos.value, busqueda.value));
  const intercambio = usarIntercambio(apiPlazos.intercambio, cargar);
  return { registros, total: computed(() => todos.value.length), cargando, busqueda, intercambio };
}
