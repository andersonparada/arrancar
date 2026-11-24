import { computed, ref, watch, type Ref } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiParcelas, type NodoDeParcela } from '../../servicios/parcelas.api';
import { usarAjustesDeSuperficie } from '../superficie/usar-ajustes-de-superficie';
import { agruparPorLocalidad, idsConHijas } from './arbol-de-parcelas';

/** Lo que el operador pone para acotar la lista. */
export interface FiltrosDeLaLista {
  localidadId: string | null;
  texto: string;
  verInactivas: boolean;
}

const SIN_PARCELAS: NodoDeParcela[] = [];
const SIN_FILTROS: FiltrosDeLaLista = { localidadId: null, texto: '', verInactivas: false };

/** Si el operador acotó la lista de alguna manera (para ofrecer «Quitar filtros» y explicar una lista vacía). */
export const hayFiltrosPuestos = (filtros: FiltrosDeLaLista): boolean =>
  Boolean(filtros.localidadId || filtros.texto.trim() || filtros.verInactivas);

/** Qué subparcelas están escondidas: se esconden de a una o todas a la vez. */
function usarColapso(raices: () => NodoDeParcela[]) {
  const colapsadas = ref<Set<string>>(new Set());

  function alternar(id: string): void {
    const nuevas = new Set(colapsadas.value);
    if (!nuevas.delete(id)) nuevas.add(id);
    colapsadas.value = nuevas;
  }

  return {
    colapsadas,
    alternar,
    contraerTodo: () => (colapsadas.value = new Set(idsConHijas(raices()))),
    expandirTodo: () => (colapsadas.value = new Set()),
  };
}

/**
 * Trae el árbol con los filtros puestos. Las localidades para el filtro salen de la lista sin acotar (y no de Empresas,
 * para que quien solo ve parcelas no necesite otros permisos).
 */
function usarArbolCargado(filtros: Ref<FiltrosDeLaLista>) {
  const localidadesConocidas = ref<{ id: string; nombre: string }[]>([]);
  const carga = usarCarga(
    async () => {
      const { localidadId, texto, verInactivas } = filtros.value;
      const arbol = await apiParcelas.arbol({ localidadId, texto, soloActivas: !verInactivas });
      if (!localidadId && !texto.trim()) {
        localidadesConocidas.value = agruparPorLocalidad(arbol, new Set()).map((grupo) => ({
          id: grupo.localidadId,
          nombre: grupo.localidadNombre,
        }));
      }
      return arbol;
    },
    SIN_PARCELAS,
    'No se pudieron cargar las parcelas.',
  );
  watch(() => [filtros.value.localidadId, filtros.value.verInactivas], carga.cargar);
  alDejarDeEscribir(() => filtros.value.texto, carga.cargar);
  return { raices: carga.datos, cargando: carga.cargando, cargar: carga.cargar, localidadesConocidas };
}

/** La lista de parcelas armada como árbol por localidad, con sus filtros, su colapso y el Excel. */
export function usarArbolDeParcelas() {
  const { mostrar } = usarAjustesDeSuperficie();
  const filtros = ref<FiltrosDeLaLista>({ ...SIN_FILTROS });
  const { raices, cargando, cargar, localidadesConocidas } = usarArbolCargado(filtros);
  const colapso = usarColapso(() => raices.value);

  return {
    filtros,
    cargando,
    mostrar,
    localidadesConocidas,
    grupos: computed(() => agruparPorLocalidad(raices.value, colapso.colapsadas.value, !filtros.value.texto.trim())),
    sinSumas: computed(() => Boolean(filtros.value.texto.trim())),
    hayFiltros: computed(() => hayFiltrosPuestos(filtros.value)),
    hayConHijas: computed(() => idsConHijas(raices.value).length > 0),
    intercambio: usarIntercambio(apiParcelas.intercambio, cargar),
    ...colapso,
    limpiarFiltros: () => (filtros.value = { ...SIN_FILTROS }),
  };
}
