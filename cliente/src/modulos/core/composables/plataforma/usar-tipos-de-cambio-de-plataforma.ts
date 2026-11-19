import { computed, onMounted, ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiMonedas, type Moneda } from '../../servicios/monedas.api';
import { monedaInicial, monedasParaTipos } from './lista-de-monedas';
import { usarCalendarioDelMes } from './usar-calendario-del-mes';
import { usarEstadoDeLaCarga } from './usar-estado-de-la-carga';

/** Trae las monedas al abrir y deja elegida la inicial (el dólar) en el mes de hoy. */
function usarInicio(alIniciar: (monedas: Moneda[]) => Promise<void>) {
  const avisos = usarAvisos();
  const monedas = ref<Moneda[]>([]);
  const cargando = ref(true);
  onMounted(async () => {
    try {
      monedas.value = await apiMonedas.listar();
      await alIniciar(monedas.value);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las monedas.');
    } finally {
      cargando.value = false;
    }
  });
  return { monedas, cargando };
}

/**
 * La pantalla de tipos de cambio de soporte: la moneda elegida, el calendario del mes, el estado de cada serie y la
 * bitácora de la carga. `recargar` lo vuelve a pedir todo (tras cargar o corregir un tipo).
 */
export function usarTiposDeCambioDePlataforma() {
  const moneda = ref('');
  const carga = usarEstadoDeLaCarga(moneda);
  const hoy = computed(() => carga.estado.value.hoy);
  const mes = usarCalendarioDelMes(moneda, hoy);
  const { monedas, cargando } = usarInicio(async (todas) => {
    await carga.pedirEstado();
    moneda.value = monedaInicial(todas);
    mes.irAlMesDeHoy();
  });
  return {
    cargando,
    moneda,
    hoy,
    estado: carga.estado,
    soloDeLaMoneda: carga.soloDeLaMoneda,
    opcionesDeMoneda: computed(() => monedasParaTipos(monedas.value)),
    mes,
    recargar: () => Promise.all([mes.pedirSerie(), carga.pedirEstado()]),
  };
}
