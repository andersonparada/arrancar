import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiImpresionDeCheques } from '../../servicios/impresion-de-cheques.api';
import type { ImpresionRegistrada } from '../../servicios/tipos-de-impresion-de-cheques';
import { tituloDeCheque } from './usar-reimpresion-de-cheque';

/** La historia de impresiones de un cheque (quién, cuándo, con qué motivo), que se trae al abrir la ventana. */
export function usarHistorialDeImpresiones() {
  const avisos = usarAvisos();
  const titulo = ref<string | null>(null);
  const impresiones = ref<ImpresionRegistrada[]>([]);
  const cargando = ref(false);

  async function abrir(cheque: { id: string; serie?: string | null; numero: number }): Promise<void> {
    titulo.value = tituloDeCheque(cheque);
    impresiones.value = [];
    cargando.value = true;
    try {
      impresiones.value = await apiImpresionDeCheques.historial(cheque.id);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo traer la historia de impresiones.');
      titulo.value = null;
    } finally {
      cargando.value = false;
    }
  }

  return { titulo, impresiones, cargando, abrir, cerrar: () => (titulo.value = null) };
}
