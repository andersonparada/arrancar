import { computed, reactive, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiArticulos, type Articulo, type ConversionDeArticulo, type Lote } from '../../servicios/articulos.api';
import { fechaDeHoy } from '../compartido/fechas';
import { opcionesDeArticulos, opcionesDeLotes, opcionesDeUnidades } from './opciones-de-renglon';

interface DetalleDeArticulo {
  conversiones: ConversionDeArticulo[];
  lotes: Lote[];
}

const traerDetalle = async (articulo: Articulo): Promise<DetalleDeArticulo> => {
  const [conversiones, lotes] = await Promise.all([
    apiArticulos.conversiones(articulo.id),
    articulo.manejaLotes ? apiArticulos.lotes(articulo.id) : Promise.resolve([] as Lote[]),
  ]);
  return { conversiones, lotes };
};

/** De cada artículo que se elige, sus unidades y lotes: se piden la primera vez y quedan guardados. */
function usarDetallesDeArticulos(articuloDe: (id: string | null) => Articulo | null) {
  const avisos = usarAvisos();
  const detalles = reactive<Record<string, DetalleDeArticulo>>({});
  const enCamino = new Set<string>();

  async function cargarDetalle(articuloId: string | null): Promise<void> {
    const articulo = articuloDe(articuloId);
    if (!articulo || detalles[articulo.id] || enCamino.has(articulo.id)) return;
    enCamino.add(articulo.id);
    try {
      detalles[articulo.id] = await traerDetalle(articulo);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las unidades y lotes del artículo.');
    } finally {
      enCamino.delete(articulo.id);
    }
  }

  return { detalles, cargarDetalle };
}

/** Los artículos para elegir en los renglones y, de cada uno elegido, sus unidades y lotes. */
export function usarCatalogoDeRenglones() {
  const { datos: articulos, cargando } = usarCarga(
    () => apiArticulos.listar(),
    [] as Articulo[],
    'No se pudieron cargar los artículos.',
  );
  const articuloDe = (id: string | null): Articulo | null => articulos.value.find((a) => a.id === id) ?? null;
  const { detalles, cargarDetalle } = usarDetallesDeArticulos(articuloDe);

  return {
    articulos,
    cargando,
    articuloDe,
    cargarDetalle,
    ...opcionesDeLosDetalles(articulos, articuloDe, detalles),
  };
}

function opcionesDeLosDetalles(
  articulos: Ref<Articulo[]>,
  articuloDe: (id: string | null) => Articulo | null,
  detalles: Record<string, DetalleDeArticulo>,
) {
  return {
    lotesDe: (id: string | null): Lote[] => (id ? (detalles[id]?.lotes ?? []) : []),
    opcionesDeArticulos: computed(() => opcionesDeArticulos(articulos.value)),
    opcionesDeUnidadesDe: (id: string | null) =>
      opcionesDeUnidades(articuloDe(id), id ? (detalles[id]?.conversiones ?? []) : []),
    opcionesDeLotesDe: (id: string | null) => opcionesDeLotes(id ? (detalles[id]?.lotes ?? []) : [], fechaDeHoy()),
  };
}

export type CatalogoDeRenglones = ReturnType<typeof usarCatalogoDeRenglones>;
