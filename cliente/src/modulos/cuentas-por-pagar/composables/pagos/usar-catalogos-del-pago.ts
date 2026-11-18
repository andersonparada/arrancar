import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiPagos, LIMITE_DE_PAGINA, type MediosDePago, type NotaParaLigar } from '../../servicios/pagos.api';
import { consultaDeNotas, errorDelRangoDeNotas, filtroDeNotasVacio } from './filtro-de-notas';
import { mensajeDe } from './mensaje-de-error';

/**
 * Las notas ya registradas según el filtro; si dos pedidos se cruzan, solo vale el último. No avisa nada por el tope:
 * la pantalla lo explica en la pestaña de notas, donde se puede filtrar.
 */
function usarNotasParaLigar(puedeLigar: () => boolean) {
  const avisos = usarAvisos();
  const notas = ref<NotaParaLigar[]>([]);
  const cargandoNotas = ref(false);
  const filtro = reactive(filtroDeNotasVacio());
  let ultimo = 0;

  async function traerNotas(): Promise<void> {
    if (!puedeLigar() || errorDelRangoDeNotas(filtro)) return;
    const numero = ++ultimo;
    cargandoNotas.value = true;
    try {
      const { elementos } = await apiPagos.notasParaLigar(consultaDeNotas(filtro));
      if (numero === ultimo) notas.value = elementos;
    } catch (error) {
      if (numero === ultimo) avisos.error(mensajeDe(error, 'No se pudieron cargar las notas de Bancos.'));
    } finally {
      if (numero === ultimo) cargandoNotas.value = false;
    }
  }
  watch(filtro, traerNotas);
  const notasAlTope = computed(() => notas.value.length >= LIMITE_DE_PAGINA);
  return { notas, cargandoNotas, filtroDeNotas: filtro, traerNotas, notasAlTope };
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
