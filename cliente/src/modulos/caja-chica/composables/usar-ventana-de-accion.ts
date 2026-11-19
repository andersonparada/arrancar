import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';

interface OpcionesDeLaVentana<Edicion, Respuesta> {
  /** La edición con la que se abre la ventana, siempre nueva. */
  inicial: () => Edicion;
  /** Lo que falta escribir, por campo: si hay algo, no se envía y se muestra en los campos. */
  validar?: (edicion: Edicion) => Record<string, string>;
  /** Lo que se pide al servidor con lo escrito. */
  enviar: (edicion: Edicion) => Promise<Respuesta>;
  /** El aviso de éxito; puede depender de la respuesta. */
  exito: string | ((respuesta: Respuesta) => string);
  /** Qué hacer al terminar bien (recargar la pantalla, ir a otra). */
  alTerminar: (respuesta: Respuesta) => unknown;
  /** Qué preparar antes de abrir (traer catálogos). */
  alAbrir?: () => void | Promise<void>;
}

interface EstadoDeLaVentana<Edicion> {
  edicion: Ref<Edicion>;
  abierta: Ref<boolean>;
  errores: Ref<Record<string, string>>;
  enviar: ReturnType<typeof usarFormulario>['enviar'];
}

/** Valida, envía, avisa y cierra; si algo falla, deja los errores en sus campos y la ventana abierta. */
function crearGuardado<Edicion, Respuesta>(
  opciones: OpcionesDeLaVentana<Edicion, Respuesta>,
  estado: EstadoDeLaVentana<Edicion>,
) {
  const avisos = usarAvisos();
  return async function guardar(): Promise<void> {
    const faltantes = opciones.validar?.(estado.edicion.value) ?? {};
    if (Object.keys(faltantes).length > 0) {
      estado.errores.value = faltantes;
      return;
    }
    let respuesta: Respuesta | undefined;
    const bien = await estado.enviar(async () => (respuesta = await opciones.enviar(estado.edicion.value)));
    if (!bien) return;
    const { exito } = opciones;
    avisos.exito(typeof exito === 'function' ? exito(respuesta as Respuesta) : exito);
    estado.abierta.value = false;
    await opciones.alTerminar(respuesta as Respuesta);
  };
}

/**
 * Una ventana que pide datos y los envía: se abre con una edición nueva, reparte los errores por campo, avisa si salió
 * bien y se cierra. Las acciones del fondo (aumentar, cambiar custodio, anular…) usan todas esta forma.
 */
export function usarVentanaDeAccion<Edicion extends object, Respuesta>(
  opciones: OpcionesDeLaVentana<Edicion, Respuesta>,
) {
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const edicion = ref(opciones.inicial()) as Ref<Edicion>;
  const guardar = crearGuardado(opciones, { edicion, abierta, errores, enviar });

  async function abrir(): Promise<void> {
    edicion.value = opciones.inicial();
    errores.value = {};
    abierta.value = true;
    await opciones.alAbrir?.();
  }

  return { abierta, edicion, errores, enviando, abrir, guardar, cerrar: () => (abierta.value = false) };
}
