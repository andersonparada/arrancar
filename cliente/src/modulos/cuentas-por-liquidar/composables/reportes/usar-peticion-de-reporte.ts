import { ref, shallowRef } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';

/**
 * Pide un reporte y guarda la respuesta; si llegan dos, solo vale la de la última petición (el usuario sigue
 * cambiando filtros). Si el servidor lo rechaza, avisa con su mensaje y deja el reporte como estaba; con
 * `limpiarSiFalla` lo quita (para no mostrar un reporte viejo bajo filtros nuevos) y deja el mensaje en `rechazo`.
 */
export function usarPeticionDeReporte<T>(pedir: () => Promise<T>, siFalla: string, limpiarSiFalla = false) {
  const avisos = usarAvisos();
  const reporte = shallowRef<T | null>(null);
  const cargando = ref(true);
  const rechazo = ref<string | undefined>(undefined);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await pedir();
      if (peticion === ultimaPeticion) {
        reporte.value = respuesta;
        rechazo.value = undefined;
      }
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      rechazo.value = error instanceof Error ? error.message : siFalla;
      avisos.error(rechazo.value);
      if (limpiarSiFalla) reporte.value = null;
    }
    if (peticion === ultimaPeticion) cargando.value = false;
  }

  return { reporte, cargando, cargar, rechazo };
}
