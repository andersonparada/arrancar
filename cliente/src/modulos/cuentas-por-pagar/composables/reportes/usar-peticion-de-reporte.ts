import { ref, shallowRef } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';

/**
 * Pide un reporte y guarda la respuesta; si llegan dos, solo vale la de la última petición (el usuario sigue
 * cambiando filtros). Si el servidor lo rechaza, avisa con su mensaje y deja el reporte como estaba.
 */
export function usarPeticionDeReporte<T>(pedir: () => Promise<T>, siFalla: string) {
  const avisos = usarAvisos();
  const reporte = shallowRef<T | null>(null);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await pedir();
      if (peticion === ultimaPeticion) reporte.value = respuesta;
    } catch (error) {
      if (peticion === ultimaPeticion) avisos.error(error instanceof Error ? error.message : siFalla);
    }
    if (peticion === ultimaPeticion) cargando.value = false;
  }

  return { reporte, cargando, cargar };
}
