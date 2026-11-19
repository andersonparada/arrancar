import { computed, onMounted, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiAnticipos, type Anticipo } from '../../servicios/anticipos.api';
import { apiGastos, type Gasto } from '../../servicios/gastos.api';
import { usarGastoSinDocumento } from '../gastos/usar-gasto-sin-documento';
import { usarCambioConMotivo } from '../usar-cambio-con-motivo';
import { cambioDeAnular, cambioDeQuitar, cambioDeReabrir } from './cambios-de-la-ficha';

/** El anticipo y sus gastos, traídos juntos; si algo falla se avisa y la ficha queda como estaba. */
function usarDatosDeLaFicha(id: () => string) {
  const avisos = usarAvisos();
  const ficha = ref<Anticipo | null>(null);
  const gastos = ref<Gasto[]>([]);
  const cargando = ref(true);

  async function cargar(): Promise<void> {
    cargando.value = true;
    try {
      [ficha.value, gastos.value] = await Promise.all([apiAnticipos.obtener(id()), apiGastos.delAnticipo(id())]);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el anticipo.');
    } finally {
      cargando.value = false;
    }
  }
  onMounted(cargar);
  watch(id, cargar);
  return { ficha, gastos, cargando, cargar };
}

/** La ficha de un anticipo y sus acciones (gasto sin documento, quitar, anular, reabrir); cada una recarga la ficha. */
export function usarFichaDeAnticipo(id: () => string) {
  const sesion = usarSesion();
  const { ficha, gastos, cargando, cargar } = usarDatosDeLaFicha(id);
  const cambio = usarCambioConMotivo(cargar);
  const conFicha = (accion: (anticipo: Anticipo) => void) => (): void => {
    if (ficha.value) accion(ficha.value);
  };
  return {
    ficha,
    gastos,
    cargando,
    cambio,
    sinDocumento: usarGastoSinDocumento(id, cargar),
    anular: conFicha((anticipo) => cambio.abrir(cambioDeAnular(anticipo))),
    reabrir: conFicha((anticipo) => cambio.abrir(cambioDeReabrir(anticipo))),
    quitar: (gasto: Gasto): void => cambio.abrir(cambioDeQuitar(gasto)),
    puedeGastoSinDocumento: computed(() => sesion.config('cuentas-por-liquidar.gastos_sin_documento.permitidos', true)),
  };
}
