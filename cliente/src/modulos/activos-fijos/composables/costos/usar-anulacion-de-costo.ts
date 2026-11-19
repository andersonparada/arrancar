import { computed, ref } from 'vue';
import type { Costo } from '../../servicios/costos.api';
import { mensajeDeAnulacionDeCosto } from './edicion-de-costo';

/** La ventana de motivo para anular un costo: qué costo se anula y qué pasará, para que quien confirma lo vea. */
export function usarAnulacionDeCosto(total: () => string, anular: (costo: Costo, motivo: string) => Promise<boolean>) {
  const costo = ref<Costo | null>(null);
  const motivo = ref('');
  const texto = computed(() => (costo.value ? mensajeDeAnulacionDeCosto(costo.value, total()) : ''));

  function pedir(porAnular: Costo): void {
    motivo.value = '';
    costo.value = porAnular;
  }

  async function confirmar(): Promise<void> {
    if (costo.value && (await anular(costo.value, motivo.value.trim()))) costo.value = null;
  }

  return { costo, motivo, texto, pedir, confirmar, cerrar: () => (costo.value = null) };
}
