import { onMounted, ref, type Ref } from 'vue';
import { usarAvisos } from '../almacenes/avisos';

/**
 * Trae los datos de una pantalla al abrirla y cada vez que se llama a `cargar`.
 * Si el servidor falla, avisa con su mensaje y deja los datos como estaban.
 */
export function usarCarga<T>(obtener: () => Promise<T>, inicial: T, siFalla: string) {
  const avisos = usarAvisos();
  const datos = ref(inicial) as Ref<T>;
  const cargando = ref(true);

  async function cargar(): Promise<void> {
    cargando.value = true;
    try {
      datos.value = await obtener();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : siFalla);
    } finally {
      cargando.value = false;
    }
  }

  onMounted(cargar);
  return { datos, cargando, cargar };
}
