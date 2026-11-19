import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiImpresionDeCheques } from '../../servicios/impresion-de-cheques.api';
import type { VistaDeImpresion } from '../../servicios/tipos-de-impresion-de-cheques';
import { usarPapelImpreso } from '../formatos-de-cheque/usar-papel-impreso';
import {
  avisosDeLaVista,
  idsDeLaVista,
  parteInicial,
  partesDeLaVista,
  reglaDePaginaDe,
  situacionDeLaImpresion,
  tituloDelDocumento,
  type ParteDeLaImpresion,
} from './armado-de-la-impresion';
import { tomarImpresionLista } from './impresion-lista';

/** El nombre de la ventana es el que sugiere el navegador al guardar en PDF; al salir se devuelve el anterior. */
function usarTituloDelPapel(vista: Ref<VistaDeImpresion | null>): void {
  const original = document.title;
  watch(vista, (papel) => {
    if (papel) document.title = tituloDelDocumento(papel);
  });
  onBeforeUnmount(() => (document.title = original));
}

/** La reimpresión ya registrada que dejó su ventana, o la vista previa del servidor; si falla, deja dicho por qué. */
async function prepararVista(
  ids: string[],
  registrada: Ref<boolean>,
  problema: Ref<string | null>,
): Promise<VistaDeImpresion> {
  const lista = tomarImpresionLista(ids);
  if (lista) {
    registrada.value = true;
    return lista;
  }
  try {
    return await apiImpresionDeCheques.vistaPrevia(ids);
  } catch (error) {
    problema.value = error instanceof Error ? error.message : 'No se pudo preparar la impresión.';
    throw error;
  }
}

/** Si algún cheque todavía no figura como impreso, registra la impresión (todo o nada) y deja lo que responde el servidor. */
async function registrarSiHaceFalta(vista: Ref<VistaDeImpresion | null>, registrada: Ref<boolean>): Promise<void> {
  if (!vista.value || situacionDeLaImpresion(vista.value, registrada.value) !== 'por-registrar') return;
  vista.value = await apiImpresionDeCheques.imprimir(idsDeLaVista(vista.value));
  registrada.value = true;
}

/**
 * Mandar a la impresora una parte: si algún cheque todavía no figura como impreso, primero se registra (todo o nada),
 * se vuelve a dibujar con lo que responde el servidor y recién entonces se abre el diálogo del navegador.
 */
function usarEnvioALaImpresora(
  vista: Ref<VistaDeImpresion | null>,
  registrada: Ref<boolean>,
  parte: Ref<ParteDeLaImpresion>,
) {
  const avisos = usarAvisos();
  const imprimiendo = ref(false);

  async function imprimir(deQue: ParteDeLaImpresion): Promise<void> {
    if (!vista.value) return;
    imprimiendo.value = true;
    try {
      await registrarSiHaceFalta(vista, registrada);
      parte.value = deQue;
      await nextTick();
      window.print();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo registrar la impresión.');
    } finally {
      imprimiendo.value = false;
    }
  }

  return { imprimiendo, imprimir };
}

/**
 * La pantalla de impresión de cheques. La vista previa no cambia nada; «Imprimir» registra la impresión y abre el
 * diálogo del navegador. Una reimpresión ya registrada llega lista desde su ventana y solo se manda a la impresora.
 */
export function usarImpresionDeCheques(ids: string[]) {
  const registrada = ref(false);
  const parte = ref<ParteDeLaImpresion>('cheques');
  const problema = ref<string | null>(null);
  const { datos: vista, cargando } = usarCarga<VistaDeImpresion | null>(
    () => prepararVista(ids, registrada, problema),
    null,
    'No se pudo preparar la impresión.',
  );
  const partes = computed(() => (vista.value ? partesDeLaVista(vista.value) : { cheques: 0, comprobantes: 0 }));
  const situacion = computed(() => (vista.value ? situacionDeLaImpresion(vista.value, registrada.value) : null));
  const avisosDeLaImpresion = computed(() => (vista.value ? avisosDeLaVista(vista.value) : []));
  usarPapelImpreso(() => (vista.value ? reglaDePaginaDe(vista.value, parte.value) : ''));
  usarTituloDelPapel(vista);
  watch(vista, (papel) => papel && (parte.value = parteInicial(papel)), { once: true });
  const envio = usarEnvioALaImpresora(vista, registrada, parte);

  return { vista, cargando, problema, parte, partes, situacion, avisosDeLaImpresion, ...envio };
}
