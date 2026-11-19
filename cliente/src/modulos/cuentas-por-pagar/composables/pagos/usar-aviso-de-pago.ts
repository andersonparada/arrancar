import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCancelacionDeCorreo } from '@/modulos/core/composables/correo/usar-acciones-de-correo';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPagos, type AvisoDePago, type FichaDePago } from '../../servicios/pagos.api';
import {
  alternarDestinatario,
  edicionAbierta,
  edicionCerrada,
  solicitudDeAviso,
  type EdicionDeAviso,
} from './aviso-de-pago';

/** La ventana de enviar: se abre con lo preseleccionado y manda el aviso con los destinatarios marcados. */
function usarEnvioDelAviso(id: () => string, aviso: Ref<AvisoDePago | null>, alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();
  const edicion = ref<EdicionDeAviso>(edicionCerrada());

  const abrir = (): void => {
    if (aviso.value) edicion.value = edicionAbierta(aviso.value);
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  const alternar = (posible: Parameters<typeof alternarDestinatario>[1]): void => {
    edicion.value = alternarDestinatario(edicion.value, posible);
  };

  async function confirmar(): Promise<void> {
    const actual = aviso.value;
    if (!actual) return;
    const enviado = await enviar(() => apiPagos.enviarAviso(id(), solicitudDeAviso(edicion.value, actual)));
    if (!enviado) return;
    avisos.exito('El aviso quedó en la bandeja de correo.');
    cerrar();
    await alTerminar();
  }

  return { edicion, enviando, abrir, cerrar, alternar, confirmar };
}

/**
 * El aviso de pago por correo de la ficha: lo que se puede enviar, lo ya enviado, y enviar o cancelar. Se vuelve a leer
 * cuando cambia el estado del pago (al anularlo se cancelan los avisos pendientes).
 */
export function usarAvisoDePago(id: () => string, ficha: Readonly<Ref<FichaDePago | null>>) {
  const {
    datos: aviso,
    cargando,
    cargar,
  } = usarCarga<AvisoDePago | null>(() => apiPagos.aviso(id()), null, 'No se pudo cargar el aviso por correo.');
  watch(id, cargar);
  watch(
    () => ficha.value?.estado,
    (_nuevo, anterior) => {
      if (anterior !== undefined) void cargar();
    },
  );
  const cancelacion = usarCancelacionDeCorreo({
    cancelar: (correoId, motivo) => apiPagos.cancelarAviso(id(), correoId, motivo),
    alTerminar: cargar,
  });
  return { aviso, cargando, envio: usarEnvioDelAviso(id, aviso, cargar), cancelacion };
}
