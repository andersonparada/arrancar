import { nextTick, onBeforeUnmount, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiPagos, type ComprobanteDePago } from '../../servicios/pagos.api';
import { tituloDelPapelDelPago } from './comprobante-de-pago';

/** El nombre de la ventana es el que sugiere el navegador al guardar en PDF; al salir se devuelve el anterior. */
function usarTituloDelPapel(comprobante: { value: ComprobanteDePago | null }): void {
  const original = document.title;
  watch(
    () => comprobante.value,
    (papel) => {
      if (papel) document.title = tituloDelPapelDelPago(papel);
    },
  );
  onBeforeUnmount(() => (document.title = original));
}

/** El comprobante listo para imprimir; imprimirlo no cambia nada en el sistema. */
export function usarComprobanteDePago(id: () => string) {
  const { datos: comprobante, cargando } = usarCarga<ComprobanteDePago | null>(
    () => apiPagos.comprobante(id()),
    null,
    'No se pudo preparar el comprobante.',
  );
  usarTituloDelPapel(comprobante);
  const imprimir = async (): Promise<void> => {
    await nextTick();
    window.print();
  };
  return { comprobante, cargando, imprimir };
}
