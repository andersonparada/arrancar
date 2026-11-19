import { onBeforeUnmount, onMounted, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';

/**
 * Imprimir trae todo lo filtrado (hasta el tope) y lo deja en `impresas` hasta que termina la impresión; si no se
 * puede, avisa por qué (demasiadas filas, ninguna).
 */
export function usarImpresionDeFilas<T>(estado: () => { puede: boolean; mensaje: string }, traer: () => Promise<T[]>) {
  const avisos = usarAvisos();
  const impresas = ref<T[] | null>(null);
  const alTerminar = (): void => {
    impresas.value = null;
  };
  onMounted(() => window.addEventListener('afterprint', alTerminar));
  onBeforeUnmount(() => window.removeEventListener('afterprint', alTerminar));

  async function imprimir(): Promise<void> {
    const { puede, mensaje } = estado();
    if (!puede) return avisos.error(mensaje);
    try {
      impresas.value = await traer();
    } catch (error) {
      return avisos.error(error instanceof Error ? error.message : 'No se pudo preparar la impresión.');
    }
    // Espera a que el navegador pinte las filas antes de abrir el diálogo de impresión.
    requestAnimationFrame(() => window.print());
  }
  return { impresas, imprimir };
}
