import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiCuentasPorPagar, type DocumentoPorPagar } from '../servicios/cuentas-por-pagar.api';
import { documentoYaCambio, mensajeDeLoPropio, resumenDeAutorizacion } from './reglas-de-acciones';

type Resultado =
  { autorizado: true } | { autorizado: false; propio: string | null; mensaje: string; desactualizada: boolean };

/** Pide autorizar y devuelve qué pasó, sin lanzar: lo propio se distingue de cualquier otro error. */
async function intentarAutorizar(ids: string[]): Promise<Resultado> {
  try {
    await apiCuentasPorPagar.autorizar(ids);
    return { autorizado: true };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo autorizar.';
    return { autorizado: false, propio: mensajeDeLoPropio(error), mensaje, desactualizada: documentoYaCambio(error) };
  }
}

/** Si otra persona ya cambió un documento, no se autorizó nada y la lista se trae al día: se avisa. */
const textoDelRechazo = ({ mensaje, desactualizada }: { mensaje: string; desactualizada: boolean }): string =>
  desactualizada ? `${mensaje} No se autorizó ningún documento: revise la lista, que ya se actualizó.` : mensaje;

/**
 * «Autorizar» uno o varios documentos (todo o nada): pide confirmar con un resumen y, si el servidor rechaza porque el
 * usuario ingresó o completó alguno, deja su mensaje a la vista (`avisoDeLoPropio`) hasta que se cierre.
 * `alTerminar` se llama cuando el servidor autorizó.
 */
export function usarAutorizacion(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const enviando = ref(false);
  const avisoDeLoPropio = ref('');

  async function autorizar(documentos: DocumentoPorPagar[]): Promise<void> {
    const mensaje = resumenDeAutorizacion(documentos);
    if (!(await avisos.confirmar({ titulo: 'Autorizar documentos', mensaje, textoConfirmar: 'Autorizar' }))) return;
    enviando.value = true;
    avisoDeLoPropio.value = '';
    const resultado = await intentarAutorizar(documentos.map(({ id }) => id));
    enviando.value = false;
    if (!resultado.autorizado) {
      if (resultado.propio) avisoDeLoPropio.value = resultado.propio;
      else avisos.error(textoDelRechazo(resultado));
      if (resultado.desactualizada) await alTerminar();
      return;
    }
    avisos.exito(documentos.length === 1 ? 'Documento autorizado.' : `${documentos.length} documentos autorizados.`);
    await alTerminar();
  }

  return { enviando, avisoDeLoPropio, autorizar, cerrarAviso: () => (avisoDeLoPropio.value = '') };
}
