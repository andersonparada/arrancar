import { reactive, ref, watch } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiCorreos, type CorreoFicha, type PaginaDeCorreos } from '../../servicios/correos.api';
import { usarCarga } from '../usar-carga';
import { CORREOS_POR_PAGINA, filtroDeLaApi, filtrosVacios } from './filtro-de-correos';
import { usarCancelacionDeCorreo, usarReintentoDeCorreo } from './usar-acciones-de-correo';

const SIN_CORREOS: PaginaDeCorreos = { elementos: [], total: 0, pagina: 1, limite: CORREOS_POR_PAGINA };

/** El historial de correos: la lista filtrada y paginada, la ficha que se abre encima y sus acciones. */
export function usarCorreosEnviados() {
  const filtros = reactive(filtrosVacios());
  const {
    datos: pagina,
    cargando,
    cargar,
  } = usarCarga(
    () => apiCorreos.listar(filtroDeLaApi(filtros)),
    SIN_CORREOS,
    'No se pudo cargar el historial de correos.',
  );
  // Cambiar un filtro vuelve a la primera página; la recarga la hace el cambio de página o, si ya estaba en ella, este.
  watch(
    () => [filtros.desde, filtros.hasta, filtros.estado, filtros.tipo],
    () => (filtros.pagina === 1 ? void cargar() : (filtros.pagina = 1)),
  );
  watch(() => filtros.pagina, cargar);
  return { filtros, pagina, cargando, cargar, ...usarFicha(cargar) };
}

/** La ficha de un correo, abierta desde la lista, con cancelar y reintentar. */
function usarFicha(recargarLista: () => Promise<void>) {
  const avisos = usarAvisos();
  const ficha = ref<CorreoFicha | null>(null);

  async function abrir(id: string): Promise<void> {
    try {
      ficha.value = await apiCorreos.obtener(id);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo abrir el correo.');
    }
  }

  const alTerminar = async () => {
    await recargarLista();
    if (ficha.value) await abrir(ficha.value.id);
  };
  const cancelacion = usarCancelacionDeCorreo({ cancelar: apiCorreos.cancelar.bind(apiCorreos), alTerminar });
  const reintento = usarReintentoDeCorreo(apiCorreos.reintentar.bind(apiCorreos), alTerminar);
  return { ficha, abrir, cerrarFicha: () => (ficha.value = null), cancelacion, reintento };
}
