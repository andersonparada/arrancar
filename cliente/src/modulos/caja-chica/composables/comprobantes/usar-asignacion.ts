import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import type { ComprobanteDeLaBandeja } from '../../servicios/tipos-de-comprobantes';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import {
  cuerpoDeAsignacion,
  documentosConRetencion,
  edicionDeAsignacion,
  faltantesDeLaAsignacion,
  resumenDeAsignacion,
} from './armado-de-asignacion';

export interface DestinoDeLaAsignacion {
  id: string;
  nombre: string;
}

const textoDelExito = (cantidad: number, fondo: string): string =>
  cantidad === 1 ? `Documento asignado a «${fondo}».` : `${cantidad} documentos asignados a «${fondo}».`;

/** La ventana de asignar: valida los motivos, envía y, al terminar, muestra los avisos que no bloquean. */
function crearVentana(
  elegido: { documentos: Ref<ComprobanteDeLaBandeja[]>; destino: Ref<DestinoDeLaAsignacion | null> },
  alTerminar: () => Promise<unknown>,
) {
  const avisos = usarAvisos();
  const { documentos, destino } = elegido;
  return usarVentanaDeAccion({
    inicial: edicionDeAsignacion,
    validar: (edicion) => faltantesDeLaAsignacion(documentos.value, edicion),
    enviar: (edicion) =>
      apiComprobantes.asignar(destino.value?.id ?? '', cuerpoDeAsignacion(documentos.value, edicion)),
    exito: (resultado) => textoDelExito(resultado.comprobantes.length, destino.value?.nombre ?? ''),
    alTerminar: async (resultado) => {
      resultado.avisos.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    },
  });
}

/**
 * Asignar documentos de la bandeja a un fondo. La ventana resume lo que va a pasar y pide los motivos de las excepciones
 * (retención y tope); el servidor decide qué documentos pasan del tope, así que ese motivo se escribe de antemano y solo
 * cuenta en los que lo necesitan. Los avisos que no bloquean (bancarización, fuera del libro) se muestran al terminar.
 */
export function usarAsignacion(alTerminar: () => Promise<unknown>) {
  const documentos = ref<ComprobanteDeLaBandeja[]>([]);
  const destino = ref<DestinoDeLaAsignacion | null>(null);
  const ventana = crearVentana({ documentos, destino }, alTerminar);

  function pedir(lista: ComprobanteDeLaBandeja[], fondo: DestinoDeLaAsignacion): void {
    documentos.value = lista;
    destino.value = fondo;
    void ventana.abrir();
  }

  return {
    ...ventana,
    documentos,
    destino,
    pedir,
    resumen: computed(() => resumenDeAsignacion(documentos.value)),
    hayRetencion: computed(() => documentosConRetencion(documentos.value).length > 0),
  };
}
