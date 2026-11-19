import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiAvisosDePago } from '../../servicios/avisos-de-pago.api';
import type { AjustesDelAviso, AjustesDelAvisoConAyuda } from '../../servicios/tipos-de-avisos-de-pago';
import { ajustesParaGuardar, borradorDeAjustes, hayCambiosEnLosAjustes } from './ajustes-del-aviso';

const SIN_AJUSTES: AjustesDelAvisoConAyuda = {
  envio: 'manual',
  asunto: '',
  mensaje: '',
  adjuntarComprobante: true,
  copiaALaEmpresa: true,
  marcadoresDelAsunto: [],
  marcadoresDelMensaje: [],
  asuntoPorOmision: '',
  mensajePorOmision: '',
};

/** Guardar el borrador: reparte los errores por campo y avisa si salió bien. */
function usarGuardado(guardado: Ref<AjustesDelAvisoConAyuda>, borrador: Ref<AjustesDelAviso>) {
  const avisos = usarAvisos();
  const formulario = usarFormulario();

  async function guardar(): Promise<void> {
    const ajustes = ajustesParaGuardar(borrador.value);
    const guardada = await formulario.enviar(() => apiAvisosDePago.guardarAjustes(ajustes));
    if (!guardada) return;
    guardado.value = { ...guardado.value, ...ajustes };
    avisos.exito('Avisos de pago guardados.');
  }

  return { guardar, errores: formulario.errores, enviando: formulario.enviando };
}

/** La pantalla «Avisos de pago»: lo guardado, el borrador que se edita y cómo se guarda. */
export function usarAjustesDelAviso() {
  const { datos: guardado, cargando } = usarCarga(
    () => apiAvisosDePago.ajustes(),
    SIN_AJUSTES,
    'No se pudieron cargar los avisos de pago.',
  );
  const borrador = ref(borradorDeAjustes(guardado.value));
  watch(guardado, (nuevo) => (borrador.value = borradorDeAjustes(nuevo)));
  return {
    guardado,
    borrador,
    cargando,
    ...usarGuardado(guardado, borrador),
    hayCambios: computed(() => hayCambiosEnLosAjustes(borrador.value, guardado.value)),
  };
}
