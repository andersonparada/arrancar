import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiDteRecibidos, type DteRecibido, type EstadoDeDte } from '../../servicios/dte-recibidos.api';
import { consultaDeLaBandeja, type FiltrosDeLaBandeja } from './datos-de-la-bandeja';
import {
  alternarFilas,
  conLosDatosAlDia,
  conMarcadas,
  estanTodasMarcadas,
  paginasParaTraer,
  sinMarcadas,
  type FilasElegidas,
} from './seleccion-entre-paginas';

/** Filas por pedido al traer todo un filtro: el máximo que acepta el servidor. */
const FILAS_POR_PEDIDO = 200;

/** El filtro de una pestaña tal como estaba al pulsar el botón. */
interface FiltroPorTraer {
  estado: EstadoDeDte;
  filtros: FiltrosDeLaBandeja;
}

/** Trae todas las filas de un filtro, página por página, y avisa cuántas lleva. */
async function traerElFiltro(
  { estado, filtros }: FiltroPorTraer,
  alAvanzar: (llevadas: number) => void,
): Promise<DteRecibido[]> {
  const traidas: DteRecibido[] = [];
  // El total sale de la respuesta del servidor, no del último listado cargado: el filtro pudo cambiar hace un instante.
  for (let pagina = 1, paginas = 1; pagina <= paginas; pagina++) {
    const consulta = { ...consultaDeLaBandeja(estado, filtros, pagina), limite: FILAS_POR_PEDIDO };
    const respuesta = await apiDteRecibidos.listar(consulta);
    traidas.push(...respuesta.elementos);
    paginas = paginasParaTraer(respuesta.total, FILAS_POR_PEDIDO);
    alAvanzar(traidas.length);
  }
  return traidas;
}

/** Las filas marcadas, con su fila completa, y cómo marcarlas y quitarlas. */
function usarElegidas(filas: Ref<DteRecibido[]>) {
  const elegidas = ref<FilasElegidas>(new Map());
  const cambiar = (nuevas: FilasElegidas): void => {
    elegidas.value = nuevas;
  };
  // Al recargar la página, lo marcado se pone al día con lo que llegó (propuestas nuevas, por ejemplo).
  watch(filas, (nuevas) => cambiar(conLosDatosAlDia(elegidas.value, nuevas)));

  return {
    marcadas: computed(() => [...elegidas.value.values()]),
    paginaMarcada: computed(() => estanTodasMarcadas(elegidas.value, filas.value)),
    estaMarcada: (id: string) => elegidas.value.has(id),
    alternar: (fila: DteRecibido) => cambiar(alternarFilas(elegidas.value, [fila])),
    alternarPagina: () => cambiar(alternarFilas(elegidas.value, filas.value)),
    agregar: (nuevas: readonly DteRecibido[]) => cambiar(conMarcadas(elegidas.value, nuevas)),
    quitar: (ids: readonly string[]) => cambiar(sinMarcadas(elegidas.value, ids)),
    refrescar: (nuevas: readonly DteRecibido[]) => cambiar(conLosDatosAlDia(elegidas.value, nuevas)),
    limpiar: () => cambiar(new Map()),
  };
}

/**
 * Lo marcado en una pestaña de la bandeja. Se conserva al cambiar de página y de filtro, y «Marcar los N del filtro»
 * trae todas las filas del filtro, no solo las de la página.
 */
export function usarMarcas(estado: EstadoDeDte, filas: Ref<DteRecibido[]>, consulta: { filtros: FiltrosDeLaBandeja }) {
  const avisos = usarAvisos();
  const elegidas = usarElegidas(filas);
  const trayendo = ref<number | null>(null);

  async function marcarElFiltro(): Promise<void> {
    trayendo.value = 0;
    const filtro = { estado, filtros: { ...consulta.filtros } };
    try {
      elegidas.agregar(await traerElFiltro(filtro, (n) => (trayendo.value = n)));
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron traer todos los DTE del filtro.');
    }
    trayendo.value = null;
  }

  return { ...elegidas, trayendo, marcarElFiltro };
}
