import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { quitarErrorAlCambiar, usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { Retiro, SolicitudDeCambioDeRetiro } from '../../servicios/tipos-de-retiros';
import { errorDelMotivo } from '../reglas-de-acciones';

/** Lo que se ve en la ventana de anular o reabrir: qué pasará, el motivo y la fecha (opcional) del movimiento en Bancos. */
export interface EdicionDeCambioDeRetiro {
  abierta: boolean;
  resumen: string;
  motivo: string;
  fecha: string;
  conFecha: boolean;
}

const sinCambio = (): EdicionDeCambioDeRetiro => ({
  abierta: false,
  resumen: '',
  motivo: '',
  fecha: '',
  conFecha: false,
});

/** Lo que distingue a «anular» de «reabrir»: su resumen, si mueve dinero en Bancos, la llamada y el aviso de éxito. */
export interface CambioDeRetiro {
  resumen: (retiro: Retiro) => string;
  conFecha: (retiro: Retiro) => boolean;
  enviar: (id: string, solicitud: SolicitudDeCambioDeRetiro) => Promise<Retiro>;
  exito: (retiro: Retiro) => string;
}

type FichaActual = Readonly<Ref<Retiro | null>>;

/** El estado de la ventana: se abre con el resumen de lo que pasará y se cierra sin perder la ficha. */
function usarVentanaDelCambio(ficha: FichaActual, cambio: CambioDeRetiro) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(sinCambio());
  quitarErrorAlCambiar(errores, 'motivo', () => edicion.value.motivo);
  const abrir = (): void => {
    if (!ficha.value) return;
    const resumen = cambio.resumen(ficha.value);
    edicion.value = { ...sinCambio(), abierta: true, resumen, conFecha: cambio.conFecha(ficha.value) };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, enviando, errores, enviar, abrir, cerrar };
}

/** Anular o reabrir un retiro: dice qué pasará, pide el motivo (queda en la auditoría) y recarga la ficha al terminar. */
export function usarCambioDeRetiro(ficha: FichaActual, cambio: CambioDeRetiro, alTerminar: () => Promise<void>) {
  const { edicion, enviando, errores, enviar, abrir, cerrar } = usarVentanaDelCambio(ficha, cambio);

  async function confirmar(): Promise<void> {
    if (!ficha.value) return;
    const error = errorDelMotivo(edicion.value.motivo);
    if (error) {
      errores.value = { motivo: error };
      return;
    }
    const { motivo, fecha } = edicion.value;
    const respuesta = ref<Retiro | null>(null);
    const solicitud = { motivo: motivo.trim(), ...(fecha ? { fecha } : {}) };
    const guardado = await enviar(async () => {
      respuesta.value = await cambio.enviar(ficha.value!.id, solicitud);
    });
    if (!guardado || !respuesta.value) return;
    cerrar();
    usarAvisos().exito(cambio.exito(respuesta.value));
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, confirmar };
}
