import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { quitarErrorAlCambiar, usarFormulario } from '@/modulos/core/composables/usar-formulario';

export const MAXIMO_DEL_MOTIVO_DEL_CAMBIO = 300;

/** Lo que se ve en la ventana de un cambio que pide motivo: qué pasará, el motivo y, si mueve dinero, la fecha en Bancos. */
export interface EdicionDeCambioConMotivo {
  abierta: boolean;
  titulo: string;
  resumen: string;
  textoDelBoton: string;
  peligroso: boolean;
  conFecha: boolean;
  motivo: string;
  fecha: string;
}

/** Lo que distingue a un cambio de otro: sus textos, si lleva fecha, la llamada y el aviso de éxito. */
export interface CambioConMotivo {
  titulo: string;
  resumen: string;
  textoDelBoton: string;
  peligroso?: boolean;
  conFecha?: boolean;
  enviar: (solicitud: { motivo: string; fecha?: string }) => Promise<unknown>;
  exito: string;
}

const cerrada = (): EdicionDeCambioConMotivo => ({
  abierta: false,
  titulo: '',
  resumen: '',
  textoDelBoton: '',
  peligroso: false,
  conFecha: false,
  motivo: '',
  fecha: '',
});

/** El error del motivo, o `null` si está bien: es obligatorio porque queda en la auditoría. */
export function errorDelMotivo(motivo: string): string | null {
  const texto = motivo.trim();
  if (!texto) return 'Escriba el motivo: queda registrado en la auditoría.';
  return texto.length > MAXIMO_DEL_MOTIVO_DEL_CAMBIO
    ? `Acórtelo a ${MAXIMO_DEL_MOTIVO_DEL_CAMBIO} letras o menos.`
    : null;
}

type Edicion = Ref<EdicionDeCambioConMotivo>;

/** Abrir la ventana con los textos del cambio y cerrarla; el cambio vigente queda a mano para confirmarlo. */
function usarEstadoDelCambio(errores: Ref<Record<string, string>>) {
  const edicion = ref(cerrada());
  const vigente = ref<CambioConMotivo | null>(null);
  quitarErrorAlCambiar(errores, 'motivo', () => edicion.value.motivo);

  function abrir(nuevo: CambioConMotivo): void {
    vigente.value = nuevo;
    errores.value = {};
    edicion.value = {
      ...cerrada(),
      abierta: true,
      titulo: nuevo.titulo,
      resumen: nuevo.resumen,
      textoDelBoton: nuevo.textoDelBoton,
      peligroso: nuevo.peligroso ?? false,
      conFecha: nuevo.conFecha ?? false,
    };
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, vigente, abrir, cerrar };
}

/** Pide el motivo y hace el cambio; al terminar cierra, avisa y deja que la pantalla se recargue. */
async function confirmarElCambio(
  datos: { edicion: Edicion; cambio: CambioConMotivo; enviar: (accion: () => Promise<unknown>) => Promise<boolean> },
  errores: Ref<Record<string, string>>,
): Promise<boolean> {
  const { edicion, cambio, enviar } = datos;
  const error = errorDelMotivo(edicion.value.motivo);
  if (error) {
    errores.value = { motivo: error };
    return false;
  }
  const { motivo, fecha } = edicion.value;
  return enviar(() => cambio.enviar({ motivo: motivo.trim(), ...(fecha ? { fecha } : {}) }));
}

/**
 * Una sola ventana para los cambios que piden motivo (anular, reabrir, quitar un gasto): dice qué va a pasar, pide el motivo y
 * al terminar avisa y recarga lo que estaba a la vista.
 */
export function usarCambioConMotivo(alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const { edicion, vigente, abrir, cerrar } = usarEstadoDelCambio(errores);

  async function confirmar(): Promise<void> {
    const cambio = vigente.value;
    if (!cambio || !(await confirmarElCambio({ edicion, cambio, enviar }, errores))) return;
    cerrar();
    usarAvisos().exito(cambio.exito);
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, confirmar };
}
