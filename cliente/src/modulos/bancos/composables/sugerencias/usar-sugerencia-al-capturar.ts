import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { DatosParaSugerir, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';
import { datosParaSugerir, sugerenciaParaMostrar, type CamposParaSugerir } from './sugerencia-al-capturar';

type Pregunta = (datos: DatosParaSugerir) => Promise<SugerenciaDeMovimiento>;
type Formulario = CamposParaSugerir & { abierta: boolean; conceptoId: string | null };

/** Consulta con espera corta tras escribir; una respuesta tardía (los datos ya cambiaron) o un fallo se ignoran. */
function usarConsulta(datos: ComputedRef<DatosParaSugerir | null>, pregunta: Pregunta) {
  const respuesta = ref<SugerenciaDeMovimiento | null>(null);
  const clave = computed(() => JSON.stringify(datos.value));

  async function consultar(): Promise<void> {
    const enviados = datos.value;
    const claveEnviada = clave.value;
    if (!enviados) return void (respuesta.value = null);
    try {
      const nueva = await pregunta(enviados);
      if (clave.value === claveEnviada) respuesta.value = nueva;
    } catch {
      respuesta.value = null;
    }
  }

  alDejarDeEscribir(clave, consultar);
  return respuesta;
}

interface Configuracion {
  edicion: Ref<Formulario>;
  opciones: Ref<OpcionDeRegistro[]>;
  pregunta: Pregunta;
  /** Si el usuario puede pedirla (permiso) y la ventana la necesita (no al corregir). */
  habilitada: () => boolean;
}

/**
 * Propone el concepto mientras se captura una nota o un cheque: poco después de dejar de escribir consulta al
 * servidor y muestra el resultado bajo el selector, sin tocar lo ya elegido. La sugerencia es una ayuda, nunca un
 * estorbo: si falla, no se muestra nada.
 */
export function usarSugerenciaAlCapturar({ edicion, opciones, pregunta, habilitada }: Configuracion) {
  const datos = computed(() => (habilitada() ? datosParaSugerir(edicion.value) : null));
  const respuesta = usarConsulta(datos, pregunta);
  watch(
    () => edicion.value.abierta,
    (abierta) => abierta || (respuesta.value = null),
  );
  const sugerencia = computed(() => sugerenciaParaMostrar(respuesta.value, opciones.value, edicion.value.conceptoId));
  return { sugerencia };
}
