import { defineStore } from 'pinia';
import { ref } from 'vue';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

interface SolicitudConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  peligroso: boolean;
  resolver: (aceptado: boolean) => void;
}

const DURACION_AVISO_MS = 4500;

/** Mensajes emergentes y confirmaciones de la aplicación. */
export const usarAvisos = defineStore('avisos', () => {
  const avisos = ref<Aviso[]>([]);
  const confirmacion = ref<SolicitudConfirmacion | null>(null);
  let siguienteId = 1;

  function mostrar(tipo: TipoAviso, mensaje: string): void {
    const id = siguienteId++;
    avisos.value.push({ id, tipo, mensaje });
    setTimeout(() => cerrar(id), DURACION_AVISO_MS);
  }

  function cerrar(id: number): void {
    avisos.value = avisos.value.filter((a) => a.id !== id);
  }

  /**
   * Pide confirmación al usuario y espera su respuesta.
   * @example if (await confirmar({ mensaje: '¿Eliminar?', peligroso: true })) ...
   */
  function confirmar(opciones: {
    titulo?: string;
    mensaje: string;
    textoConfirmar?: string;
    peligroso?: boolean;
  }): Promise<boolean> {
    return new Promise((resolver) => {
      confirmacion.value = {
        titulo: opciones.titulo ?? 'Confirmar',
        mensaje: opciones.mensaje,
        textoConfirmar: opciones.textoConfirmar ?? 'Aceptar',
        peligroso: opciones.peligroso ?? false,
        resolver,
      };
    });
  }

  function responderConfirmacion(aceptado: boolean): void {
    confirmacion.value?.resolver(aceptado);
    confirmacion.value = null;
  }

  return {
    avisos,
    confirmacion,
    exito: (mensaje: string) => mostrar('exito', mensaje),
    error: (mensaje: string) => mostrar('error', mensaje),
    info: (mensaje: string) => mostrar('info', mensaje),
    cerrar,
    confirmar,
    responderConfirmacion,
  };
});
