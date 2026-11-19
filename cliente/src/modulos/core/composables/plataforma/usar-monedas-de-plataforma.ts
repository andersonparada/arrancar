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
import { esperarElFinDeLaCarga, resultadoDeLaLista } from './seguimiento-de-la-carga';
import { usarEdicionDeMoneda } from './usar-edicion-de-moneda';

const MAXIMO_DE_CONSULTAS = 200;

const traerTodo = async () => {
  const [monedas, lista, estado] = await Promise.all([
    apiMonedas.listar(),
    apiMonedas.delBanguat(),
    apiTiposDeCambio.estadoDeLaCarga(1),
  ]);
  return { monedas, lista, series: estado.series };
};

/**
 * Pide la lista al Banguat: el servidor responde enseguida y la actualización sigue en segundo plano; se pregunta
 * cada 2 segundos hasta que termine y entonces se dice con palabras qué pasó (un Banguat caído no cambia nada).
 */
function usarActualizacionDeLaLista(alTerminar: () => Promise<unknown>) {
  const avisos = usarAvisos();
  const actualizando = ref(false);

  async function actualizarLista(): Promise<void> {
    actualizando.value = true;
    try {
      const { iniciadaEn } = await apiMonedas.actualizarLista();
      const estado = await esperarElFinDeLaCarga({
        pedirEstado: () => apiTiposDeCambio.estadoDeLaCarga(MAXIMO_DE_CONSULTAS),
      });
      await alTerminar();
      const consulta = resultadoDeLaLista(estado.consultas, iniciadaEn);
      const resultado = consulta ? mensajeDeActualizacion(consulta) : null;
      if (resultado) avisos[resultado.tipo](resultado.mensaje);
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
  const actualizacion = usarActualizacionDeLaLista(cargar);
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
