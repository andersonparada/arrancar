import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiArticulos, type ConceptoParaArticulo } from '../../servicios/articulos.api';
import { apiCategorias, type Categoria } from '../../servicios/categorias.api';
import { apiUnidades, type Unidad } from '../../servicios/unidades.api';
import { opcionesDeReferencias } from './opciones-de-referencias';

/** Lo que se puede elegir en los selectores del formulario del artículo. */
export function usarReferenciasDeArticulo() {
  const { datos: categorias } = usarCarga(
    () => apiCategorias.listar(),
    [] as Categoria[],
    'No se pudieron cargar las categorías.',
  );
  const { datos: unidades } = usarCarga(
    () => apiUnidades.listar(),
    [] as Unidad[],
    'No se pudieron cargar las unidades de medida.',
  );
  const { datos: conceptos } = usarCarga(
    () => apiArticulos.conceptosDeGasto(),
    [] as ConceptoParaArticulo[],
    'No se pudieron cargar los conceptos de gasto.',
  );
  const opciones = computed(() =>
    opcionesDeReferencias({ categorias: categorias.value, unidades: unidades.value, conceptos: conceptos.value }),
  );
  return { opciones, categorias, unidades };
}
