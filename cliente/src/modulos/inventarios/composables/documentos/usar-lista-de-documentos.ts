import { computed, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiDocumentos, type Documento, type FiltrosDeDocumentos } from '../../servicios/documentos.api';
import { filtrosSinVacios } from '../compartido/opciones-de-filtro';
import { usarBodegasYCategoriasDeFiltro } from '../compartido/usar-bodegas-y-categorias';

/** Lo que el usuario elige para filtrar; vacío o `null` es «todos». */
export interface FiltrosDeLaLista {
  clase: string | null;
  bodegaId: string | null;
  estado: string | null;
  desde: string;
  hasta: string;
}

const SIN_FILTROS: FiltrosDeLaLista = { clase: null, bodegaId: null, estado: null, desde: '', hasta: '' };

/** Los documentos (entradas, salidas, recepciones…) con sus filtros; cada uno lleva a su ficha. */
export function usarListaDeDocumentos() {
  const filtros = reactive<FiltrosDeLaLista>({ ...SIN_FILTROS });
  const {
    datos: documentos,
    cargando,
    cargar,
  } = usarCarga(
    () => apiDocumentos.listar(filtrosSinVacios(filtros) as FiltrosDeDocumentos),
    [] as Documento[],
    'No se pudieron cargar los movimientos.',
  );
  watch(filtros, cargar);
  const referencias = usarBodegasYCategoriasDeFiltro();

  return {
    filtros,
    documentos,
    cargando,
    referencias,
    hayFiltros: computed(() => Object.values(filtros).some((valor) => valor)),
    limpiar: () => Object.assign(filtros, SIN_FILTROS),
  };
}
