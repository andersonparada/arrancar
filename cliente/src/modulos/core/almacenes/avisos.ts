import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { duracionDeAviso } from './duracion-de-aviso';

export type TipoAviso = 'exito' | 'error' | 'info';

/** Un enlace que acompaña al aviso (p. ej. «Imprimir el cheque» después de emitirlo). */
export interface EnlaceDeAviso {
  texto: string;
  ruta: RouteLocationRaw;
}

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
  enlace?: EnlaceDeAviso;
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

/** Los mensajes emergentes: cada uno se cierra solo al rato. */
function usarMensajesEmergentes() {
  const avisos = ref<Aviso[]>([]);
  let siguienteId = 1;

  const cerrar = (id: number) => (avisos.value = avisos.value.filter((aviso) => aviso.id !== id));

  /** Un éxito retira los errores que siguen a la vista: la acción ya salió bien y el error viejo confunde. */
  function mostrar(tipo: TipoAviso, mensaje: string, enlace?: EnlaceDeAviso): void {
    if (tipo === 'exito') avisos.value = avisos.value.filter((aviso) => aviso.tipo !== 'error');
    const id = siguienteId++;
    avisos.value.push({ id, tipo, mensaje, enlace });
    // Con enlace se da más tiempo: hay que decidir si se sigue.
    setTimeout(() => cerrar(id), duracionDeAviso(mensaje, enlace !== undefined));
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
    exito: (mensaje: string, enlace?: EnlaceDeAviso) => mostrar('exito', mensaje, enlace),
    error: (mensaje: string) => mostrar('error', mensaje),
    info: (mensaje: string) => mostrar('info', mensaje),
    cerrar,
    ...usarConfirmaciones(),
  };
});
