import { defineStore } from 'pinia';
import { ref } from 'vue';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

interface OpcionesDeConfirmacion {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  peligroso?: boolean;
}

interface SolicitudConfirmacion extends Required<OpcionesDeConfirmacion> {
  resolver: (aceptado: boolean) => void;
}

const DURACION_AVISO_MS = 4500;

/** Los mensajes emergentes: cada uno se cierra solo al rato. */
function usarMensajesEmergentes() {
  const avisos = ref<Aviso[]>([]);
  let siguienteId = 1;

  const cerrar = (id: number) => (avisos.value = avisos.value.filter((aviso) => aviso.id !== id));

  function mostrar(tipo: TipoAviso, mensaje: string): void {
    const id = siguienteId++;
    avisos.value.push({ id, tipo, mensaje });
    setTimeout(() => cerrar(id), DURACION_AVISO_MS);
  }

  return { avisos, mostrar, cerrar };
}

/** Una pregunta de sí o no que espera la respuesta del usuario. */
function usarConfirmaciones() {
  const confirmacion = ref<SolicitudConfirmacion | null>(null);

  /** @example if (await confirmar({ mensaje: '¿Eliminar?', peligroso: true })) ... */
  const confirmar = (opciones: OpcionesDeConfirmacion) =>
    new Promise<boolean>((resolver) => {
      confirmacion.value = { titulo: 'Confirmar', textoConfirmar: 'Aceptar', peligroso: false, ...opciones, resolver };
    });

  function responderConfirmacion(aceptado: boolean): void {
    confirmacion.value?.resolver(aceptado);
    confirmacion.value = null;
  }

  return { confirmacion, confirmar, responderConfirmacion };
}

/** Mensajes emergentes y confirmaciones de la aplicación. */
export const usarAvisos = defineStore('avisos', () => {
  const { avisos, mostrar, cerrar } = usarMensajesEmergentes();
  return {
    avisos,
    exito: (mensaje: string) => mostrar('exito', mensaje),
    error: (mensaje: string) => mostrar('error', mensaje),
    info: (mensaje: string) => mostrar('info', mensaje),
    cerrar,
    ...usarConfirmaciones(),
  };
});
