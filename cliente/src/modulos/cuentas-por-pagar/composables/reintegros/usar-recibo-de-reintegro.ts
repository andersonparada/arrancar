import { onBeforeUnmount, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiReintegros, type ReciboDeReintegro } from '../../servicios/reintegros.api';
import { tituloDelRecibo } from './recibo-de-reintegro';

/** Lee el recibo y pone su título a la ventana (así se llama el PDF al guardarlo); al salir se devuelve el anterior. */
export function usarReciboDeReintegro(id: () => string) {
  const carga = usarCarga<ReciboDeReintegro | null>(
    () => apiReintegros.recibo(id()),
    null,
    'No se pudo preparar el recibo del reintegro.',
  );
  const original = document.title;
  watch(
    () => carga.datos.value,
    (recibo) => {
      if (recibo) document.title = tituloDelRecibo(recibo);
    },
  );
  onBeforeUnmount(() => (document.title = original));
  return { ...carga, imprimir: () => window.print() };
}
