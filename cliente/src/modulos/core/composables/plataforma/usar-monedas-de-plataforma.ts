import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiMonedas } from '../../servicios/monedas.api';
import { apiTiposDeCambio } from '../../servicios/tipos-de-cambio.api';
import { usarCarga } from '../usar-carga';
import {
  filtrarMonedas,
  mensajeDeActualizacion,
  ultimaActualizacionDeLaLista,
  type FiltrosDeMonedas,
} from './lista-de-monedas';
import { usarEdicionDeMoneda } from './usar-edicion-de-moneda';

const traerTodo = async () => {
  const [monedas, lista, estado] = await Promise.all([
    apiMonedas.listar(),
    apiMonedas.delBanguat(),
    apiTiposDeCambio.estadoDeLaCarga(1),
  ]);
  return { monedas, lista, series: estado.series };
};

/** Pide la lista al Banguat y dice con palabras qué pasó; un Banguat caído no cambia nada. */
function usarActualizacionDeLaLista(ponerLista: (lista: Awaited<ReturnType<typeof apiMonedas.delBanguat>>) => void) {
  const avisos = usarAvisos();
  const actualizando = ref(false);

  async function actualizarLista(): Promise<void> {
    actualizando.value = true;
    try {
      const { consulta, lista } = await apiMonedas.actualizarLista();
      ponerLista(lista);
      const resultado = mensajeDeActualizacion(consulta);
      avisos[resultado.tipo](resultado.mensaje);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo actualizar la lista del Banguat.');
    } finally {
      actualizando.value = false;
    }
  }

  return { actualizando, actualizarLista };
}

/** La pantalla de Monedas de soporte: el catálogo, la lista del Banguat, el estado de cada serie y la edición. */
export function usarMonedasDePlataforma() {
  const vacio = { monedas: [], lista: [], series: [] } as Awaited<ReturnType<typeof traerTodo>>;
  const { datos, cargando, cargar } = usarCarga(traerTodo, vacio, 'No se pudieron cargar las monedas.');
  const filtros = reactive<FiltrosDeMonedas>({ conCodigo: false, activas: false });
  const actualizacion = usarActualizacionDeLaLista((lista) => (datos.value = { ...datos.value, lista }));
  return {
    ...usarEdicionDeMoneda(cargar),
    ...actualizacion,
    cargando,
    filtros,
    visibles: computed(() => filtrarMonedas(datos.value.monedas, filtros)),
    total: computed(() => datos.value.monedas.length),
    lista: computed(() => datos.value.lista),
    series: computed(() => datos.value.series),
    ultimaActualizacion: computed(() => ultimaActualizacionDeLaLista(datos.value.lista)),
  };
}
