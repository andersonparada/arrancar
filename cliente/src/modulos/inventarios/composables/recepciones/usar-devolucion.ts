import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { fechaDeHoy } from '../compartido/fechas';
import {
  datosDeDevolucion,
  devolucionNueva,
  entradasDeLaFactura,
  erroresDeDevolucion,
  resumenDeDevolucion,
  type EdicionDeDevolucion,
  type EntradaDevolvible,
} from './edicion-de-nota';
import { usarEnvioDeNota } from './usar-envio-de-nota';

const cerrada = (): EdicionDeDevolucion => ({
  abierta: false,
  nota: '',
  lineaId: '',
  fecha: '',
  observaciones: '',
  filas: [],
});

/** Trae lo recibido de la factura de la nota; si no hay nada que devolver, lo dice y devuelve `null`. */
function usarEntradasDeLaFactura() {
  const avisos = usarAvisos();
  const preparando = ref(false);

  async function traer(nota: LineaPorRecibir): Promise<EntradaDevolvible[] | null> {
    preparando.value = true;
    try {
      const entradas = entradasDeLaFactura(await apiRecepciones.recepcionesVigentes(), nota.documentoAfectadoId);
      if (entradas.length) return entradas;
      avisos.error('La factura de esta nota no tiene recepciones vigentes: no hay mercadería que devolver.');
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las entradas de la factura.');
    } finally {
      preparando.value = false;
    }
    return null;
  }

  return { preparando, traer };
}

/** La ventana de devolución: deja escribir cuánto de cada entrada de la factura de la nota vuelve al proveedor. */
export function usarDevolucion(alTerminar: () => Promise<void>) {
  const edicion = ref<EdicionDeDevolucion>(cerrada());
  const { enviando, errores, guardar } = usarEnvioDeNota(edicion, alTerminar);
  const { preparando, traer } = usarEntradasDeLaFactura();

  async function abrir(nota: LineaPorRecibir): Promise<void> {
    const entradas = await traer(nota);
    if (!entradas) return;
    errores.value = {};
    edicion.value = devolucionNueva(nota, entradas, fechaDeHoy());
  }

  const enviar = () =>
    guardar({
      revisar: () => erroresDeDevolucion(edicion.value),
      pregunta: {
        titulo: 'Devolver al proveedor',
        mensaje: resumenDeDevolucion(edicion.value),
        textoConfirmar: 'Devolver',
      },
      mandar: () => apiRecepciones.devolver(datosDeDevolucion(edicion.value)),
      exito: (documento) => `Devolución n.º ${documento.numero} registrada.`,
    });

  return { edicion, enviando, errores, preparando, abrir, guardar: enviar };
}
