import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiImpresionDeCheques } from '../../servicios/impresion-de-cheques.api';
import type { ChequeParaImprimir } from '../../servicios/tipos-de-impresion-de-cheques';
import {
  datosDeReimpresion,
  problemaDelMotivo,
  reimpresionCerrada,
  reimpresionNueva,
  type EdicionDeReimpresion,
} from './edicion-de-reimpresion';
import { dejarImpresionLista } from './impresion-lista';

/** Cómo se llama el cheque en las ventanas: «cheque A7». */
export const tituloDeCheque = (cheque: { serie?: string | null; numero: number }): string =>
  `cheque ${cheque.serie ?? ''}${cheque.numero}`;

/**
 * Reimprimir un cheque ya impreso: pide el motivo y qué se reimprime, lo registra y lleva a la pantalla de impresión con
 * la respuesta lista (así lo que se imprime es lo que quedó registrado).
 */
export function usarReimpresionDeCheque() {
  const router = useRouter();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeReimpresion>(reimpresionCerrada());

  function abrir(cheque: { id: string; serie?: string | null; numero: number }): void {
    edicion.value = reimpresionNueva(cheque.id, tituloDeCheque(cheque));
    errores.value = {};
  }

  async function confirmar(): Promise<void> {
    const { chequeId } = edicion.value;
    const problema = problemaDelMotivo(edicion.value.motivo);
    if (problema) errores.value = { motivo: problema };
    if (!chequeId || problema) return;
    let impresion: ChequeParaImprimir | null = null;
    const reimprimir = async () => {
      impresion = await apiImpresionDeCheques.reimprimir(chequeId, datosDeReimpresion(edicion.value));
    };
    if (!(await enviar(reimprimir)) || !impresion) return;
    dejarImpresionLista({ cheques: [impresion], avisos: [], loteId: null });
    edicion.value.abierta = false;
    await router.push({ name: 'bancos.cheques.imprimir', query: { ids: chequeId } });
  }

  return { edicion, enviando, errores, abrir, confirmar, cerrar: () => (edicion.value.abierta = false) };
}
