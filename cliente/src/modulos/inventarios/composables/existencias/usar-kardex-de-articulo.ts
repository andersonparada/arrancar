import { computed, reactive, watch, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import type { Bodega } from '../../servicios/bodegas.api';
import {
  apiExistencias,
  type Existencia,
  type FiltrosDeKardex,
  type KardexDelArticulo,
} from '../../servicios/existencias.api';
import { filtrosSinVacios } from '../compartido/opciones-de-filtro';
import { usarBodegasYCategoriasDeFiltro } from '../compartido/usar-bodegas-y-categorias';
import {
  bodegaPorOmision,
  bodegasDeLasExistencias,
  opcionesDeBodegasDelKardex,
  puedePedirElKardex,
} from './bodegas-del-kardex';

interface FiltrosEscritos {
  bodegaId: string | null;
  desde: string;
  hasta: string;
}

/** El kardex con sus filtros. Sin alcance total no se pide hasta que haya una bodega elegida. */
function usarKardexFiltrado(articuloId: string, veTodas: boolean) {
  const filtros = reactive<FiltrosEscritos>({ bodegaId: null, desde: '', hasta: '' });
  const kardex = usarCarga(
    async () =>
      puedePedirElKardex(filtros.bodegaId, veTodas)
        ? apiExistencias.kardex(articuloId, filtrosSinVacios(filtros) as FiltrosDeKardex)
        : null,
    null as KardexDelArticulo | null,
    'No se pudo cargar el kardex.',
  );
  watch(filtros, kardex.cargar);
  return { filtros, kardex };
}

/**
 * Las bodegas que se ofrecen: las que el usuario lista o, sin permiso para listarlas, las que aparecen en las
 * existencias que el servidor ya recortó a su alcance. Sin alcance total, el kardex abre con la primera en cuanto llegan.
 */
function usarBodegasVisibles(
  bodegas: Ref<Bodega[]>,
  existencias: Ref<Existencia[]>,
  eleccion: { filtros: FiltrosEscritos; veTodas: boolean },
) {
  const visibles = computed(() => (bodegas.value.length ? bodegas.value : bodegasDeLasExistencias(existencias.value)));
  watch(visibles, (lista) => {
    if (eleccion.filtros.bodegaId === null) eleccion.filtros.bodegaId = bodegaPorOmision(lista, eleccion.veTodas);
  });
  return visibles;
}

/** El kardex de un artículo y lo que hay de él en cada bodega y lote. */
export function usarKardexDeArticulo(articuloId: string) {
  const veTodas = usarSesion().puede('inventarios.bodegas.ver-todas');
  const { filtros, kardex } = usarKardexFiltrado(articuloId, veTodas);
  const { bodegas } = usarBodegasYCategoriasDeFiltro();
  const existencias = usarCarga(
    () => apiExistencias.listar({ articuloId, incluirEnCero: true }),
    [] as Existencia[],
    'No se pudieron cargar las existencias del artículo.',
  );
  const bodegasVisibles = usarBodegasVisibles(bodegas, existencias.datos, { filtros, veTodas });

  return {
    filtros,
    kardex: kardex.datos,
    cargandoElKardex: kardex.cargando,
    existencias: existencias.datos,
    cargandoLasExistencias: existencias.cargando,
    opcionesDeBodegas: computed(() => opcionesDeBodegasDelKardex(bodegasVisibles.value, veTodas)),
    faltaElegirBodega: computed(() => !puedePedirElKardex(filtros.bodegaId, veTodas)),
    veTodas,
  };
}
