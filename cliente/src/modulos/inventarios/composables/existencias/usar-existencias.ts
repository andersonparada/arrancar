import { computed, reactive, ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiExistencias, type Existencia, type FiltrosDeExistencias } from '../../servicios/existencias.api';
import { filtrosSinVacios } from '../compartido/opciones-de-filtro';
import { usarBodegasYCategoriasDeFiltro } from '../compartido/usar-bodegas-y-categorias';
import { agruparPorArticulo, filtrarPorTexto, valorDeLaLista } from './agrupar-existencias';

/** Lo que el usuario elige para filtrar; `null` es «todas». */
export interface FiltrosEscritos {
  bodegaId: string | null;
  categoriaId: string | null;
  tipoDeInventario: string | null;
  incluirEnCero: boolean;
}

const SIN_FILTROS: FiltrosEscritos = {
  bodegaId: null,
  categoriaId: null,
  tipoDeInventario: null,
  incluirEnCero: false,
};

/** Las existencias traídas con los filtros que se mandan al servidor. */
function usarExistenciasFiltradas() {
  const filtros = reactive<FiltrosEscritos>({ ...SIN_FILTROS });
  const { datos, cargando, cargar } = usarCarga(
    () => apiExistencias.listar(filtrosSinVacios(filtros) as FiltrosDeExistencias),
    [] as Existencia[],
    'No se pudieron cargar las existencias.',
  );
  watch(filtros, cargar);
  return { filtros, datos, cargando };
}

/** Las existencias por artículo, con los filtros del servidor y la búsqueda que se hace aquí. */
export function usarExistencias() {
  const { filtros, datos, cargando } = usarExistenciasFiltradas();
  const busqueda = ref('');
  const articulos = computed(() => agruparPorArticulo(datos.value));
  const visibles = computed(() => filtrarPorTexto(articulos.value, busqueda.value));

  return {
    filtros,
    busqueda,
    cargando,
    articulos,
    visibles,
    hayFiltros: computed(() => !!(filtros.bodegaId || filtros.categoriaId || filtros.tipoDeInventario)),
    valorTotal: computed(() => valorDeLaLista(visibles.value)),
    referencias: usarBodegasYCategoriasDeFiltro(),
    limpiar: () => {
      Object.assign(filtros, SIN_FILTROS);
      busqueda.value = '';
    },
  };
}
