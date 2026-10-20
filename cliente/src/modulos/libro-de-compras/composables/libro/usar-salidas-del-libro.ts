import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import type { ArchivoDescargado } from '@/modulos/core/servicios/cliente-http';
import { guardarArchivo } from '@/modulos/core/utilidades/archivos';
import { apiLibro, type EmisionDelLibro, type EmisionesDelLibro } from '../../servicios/libro.api';
import { usarCorreccionDelFolio } from './usar-correccion-del-folio';
import { usarEmisionDelLibro } from './usar-emision-del-libro';

/** Baja un archivo y avisa si falla. */
function usarDescargas() {
  const avisos = usarAvisos();
  const descargando = ref(false);

  async function descargar(obtener: () => Promise<ArchivoDescargado>): Promise<void> {
    descargando.value = true;
    try {
      guardarArchivo(await obtener());
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo descargar el archivo.');
    } finally {
      descargando.value = false;
    }
  }
  return { descargando, descargar };
}

/** Las emisiones del período y el último folio, que se piden al cambiar de período. */
function usarEmisiones(periodo: Ref<string>) {
  const avisos = usarAvisos();
  const datos = ref<EmisionesDelLibro | null>(null);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    try {
      const respuesta = await apiLibro.emisiones(periodo.value);
      if (peticion === ultima) datos.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      datos.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las emisiones.');
    }
  }
  watch(periodo, () => void cargar());
  onMounted(cargar);
  return { datos, cargar };
}

/** Todo lo que sale del libro del período: Excel, borrador, emisión con folios, copias y corrección del folio. */
export function usarSalidasDelLibro(periodo: Ref<string>) {
  const { datos, cargar } = usarEmisiones(periodo);
  const { descargando, descargar } = usarDescargas();
  const emisiones = ref<EmisionDelLibro[]>([]);
  watch(datos, (nuevo) => (emisiones.value = nuevo?.emisiones ?? []), { immediate: true });

  return {
    ultimoFolio: computed(() => datos.value?.ultimoFolio ?? 0),
    emisiones,
    descargando,
    emision: usarEmisionDelLibro(periodo, emisiones, cargar),
    correccion: usarCorreccionDelFolio(cargar),
    exportar: () => descargar(() => apiLibro.exportar(periodo.value)),
    verBorrador: () => descargar(() => apiLibro.borrador(periodo.value)),
    descargarCopia: (id: string) => descargar(() => apiLibro.copia(id)),
  };
}
