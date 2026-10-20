import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiLibro, type AnuladoDelLibro, type LibroDelPeriodo } from '../../servicios/libro.api';
import { opcionesDePeriodoDelLibro, periodoAnterior } from './datos-del-libro';

/** Pide algo del período; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionPorPeriodo<T>(obtener: (periodo: string) => Promise<T>, siFalla: string) {
  const avisos = usarAvisos();
  const datos = ref<T | null>(null);
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(periodo: string): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await obtener(periodo);
      if (peticion === ultima) datos.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      datos.value = null;
      avisos.error(error instanceof Error ? error.message : siFalla);
    }
    if (peticion === ultima) cargando.value = false;
  }

  return { datos, cargando, cargar };
}

/** Las dos peticiones del período: el libro y, solo si se pide, el anexo de anulados. */
function usarPeticiones(periodo: Ref<string>, verAnulados: Ref<boolean>) {
  const libro = usarPeticionPorPeriodo<LibroDelPeriodo>(
    (mes) => apiLibro.obtener(mes),
    'No se pudo cargar el libro de compras.',
  );
  const anulados = usarPeticionPorPeriodo<AnuladoDelLibro[]>(
    (mes) => apiLibro.anulados(mes),
    'No se pudieron cargar los anulados del período.',
  );
  const cargarTodo = () => {
    void libro.cargar(periodo.value);
    if (verAnulados.value) void anulados.cargar(periodo.value);
  };
  watch(periodo, cargarTodo);
  watch(verAnulados, (abierto) => abierto && void anulados.cargar(periodo.value));
  onMounted(cargarTodo);
  return { libro, anulados, cargarTodo };
}

/** El libro del período escogido (el mes anterior al abrir) y su anexo de anulados, que se pide al abrir esa pestaña. */
export function usarLibro() {
  const periodo = ref(periodoAnterior(new Date()));
  const verAnulados = ref(false);
  const { libro, anulados, cargarTodo } = usarPeticiones(periodo, verAnulados);

  return {
    periodo,
    verAnulados,
    libro: libro.datos,
    cargandoLibro: libro.cargando,
    anulados: anulados.datos,
    cargandoAnulados: anulados.cargando,
    opcionesDePeriodo: computed(() => opcionesDePeriodoDelLibro(new Date(), periodo.value)),
    recargar: cargarTodo,
  };
}
