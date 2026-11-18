import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiPagos, LIMITE_DE_PAGINA, type MediosDePago, type NotaParaLigar } from '../../servicios/pagos.api';
import { consultaDeNotas, errorDelRangoDeNotas, filtroDeNotasVacio, type FiltroDeNotas } from './filtro-de-notas';
import { mensajeDe } from './mensaje-de-error';
import { juntarCuentasDeNotas, type CuentaDeNota } from './opciones-del-pago';

interface EstadoDeNotas {
  notas: Ref<NotaParaLigar[]>;
  cargando: Ref<boolean>;
  cuentas: Ref<readonly CuentaDeNota[]>;
  /** El número del último pedido: si dos se cruzan, solo vale el último. */
  ultimo: number;
}

/** Pide las notas del filtro; con el rango al revés no pide nada y limpia la lista, para que no quede junto al error. */
async function pedirNotas(estado: EstadoDeNotas, filtro: FiltroDeNotas): Promise<void> {
  const numero = ++estado.ultimo;
  if (errorDelRangoDeNotas(filtro)) {
    estado.notas.value = [];
    estado.cargando.value = false;
    return;
  }
  estado.cargando.value = true;
  try {
    const { elementos } = await apiPagos.notasParaLigar(consultaDeNotas(filtro));
    if (numero !== estado.ultimo) return;
    estado.notas.value = elementos;
    estado.cuentas.value = juntarCuentasDeNotas(estado.cuentas.value, elementos);
  } catch (error) {
    if (numero === estado.ultimo) usarAvisos().error(mensajeDe(error, 'No se pudieron cargar las notas de Bancos.'));
  } finally {
    if (numero === estado.ultimo) estado.cargando.value = false;
  }
}

/**
 * Las notas ya registradas según el filtro, y las cuentas que se han visto en ellas (acumuladas, para que el filtro por
 * cuenta no se encoja). No avisa nada por el tope: la pantalla lo explica en la pestaña de notas, donde se puede filtrar.
 */
function usarNotasParaLigar(puedeLigar: () => boolean) {
  const estado: EstadoDeNotas = { notas: ref([]), cargando: ref(false), cuentas: ref([]), ultimo: 0 };
  const filtro = reactive(filtroDeNotasVacio());
  const traerNotas = async (): Promise<void> => {
    if (puedeLigar()) await pedirNotas(estado, filtro);
  };
  watch(filtro, traerNotas);
  const notasAlTope = computed(() => estado.notas.value.length >= LIMITE_DE_PAGINA);
  return {
    notas: estado.notas,
    cuentasDeNotas: estado.cuentas,
    cargandoNotas: estado.cargando,
    filtroDeNotas: filtro,
    traerNotas,
    notasAlTope,
  };
}

/** Las cuentas y chequeras de Bancos y las notas ya registradas, solo si el usuario puede usarlas. */
export function usarCatalogosDelPago(puedeEmitir: () => boolean, puedeLigar: () => boolean, fecha: () => string) {
  const avisos = usarAvisos();
  const medios = ref<MediosDePago | null>(null);
  const cargando = ref(true);
  const lasNotas = usarNotasParaLigar(puedeLigar);
  async function traer(): Promise<void> {
    try {
      if (puedeEmitir()) medios.value = await apiPagos.medios(fecha());
      await lasNotas.traerNotas();
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudieron cargar las cuentas de Bancos.'));
    } finally {
      cargando.value = false;
    }
  }
  onMounted(traer);
  return { medios, cargandoCatalogos: cargando, recargarCatalogos: traer, ...lasNotas };
}
