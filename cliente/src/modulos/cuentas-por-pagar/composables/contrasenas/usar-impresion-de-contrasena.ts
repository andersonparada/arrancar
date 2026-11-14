import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiContrasenas, type ImpresionDeContrasena } from '../../servicios/contrasenas.api';
import { tituloDelDocumento } from './impresion-de-contrasena';

/** El nombre de la ventana es el que sugiere el navegador al guardar en PDF; al salir se devuelve el anterior. */
function usarTituloDelPapel(impresion: { value: ImpresionDeContrasena | null }): void {
  const original = document.title;
  watch(
    () => impresion.value,
    (papel) => {
      if (papel) document.title = tituloDelDocumento(papel);
    },
  );
  onBeforeUnmount(() => (document.title = original));
}

/**
 * La pantalla de impresión: la vista previa no cambia nada; «Imprimir» primero registra la impresión (así la segunda
 * sale como «REIMPRESIÓN»), vuelve a dibujar con la marca que corresponda y abre el diálogo del navegador.
 */
export function usarImpresionDeContrasena(id: () => string) {
  const avisos = usarAvisos();
  const { datos: impresion, cargando } = usarCarga<ImpresionDeContrasena | null>(
    () => apiContrasenas.impresion(id()),
    null,
    'No se pudo preparar la contraseña para imprimir.',
  );
  const imprimiendo = ref(false);
  usarTituloDelPapel(impresion);

  async function imprimir(): Promise<void> {
    imprimiendo.value = true;
    try {
      impresion.value = await apiContrasenas.registrarImpresion(id());
      await nextTick();
      window.print();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo registrar la impresión.');
    } finally {
      imprimiendo.value = false;
    }
  }

  return { impresion, cargando, imprimiendo, imprimir };
}
