import { onMounted, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiRetenciones, type RetencionPorResolver } from '../../servicios/retenciones.api';
import { cuerpoDeResolucion, resolucionInicial, revisarResolucion } from './datos-de-resolucion';

type Lista = 'pendiente' | 'resueltas';

/** La lista que se ve (pendientes o resueltas); si llegan dos respuestas, solo vale la de la última petición. */
function usarLista() {
  const avisos = usarAvisos();
  const lista = ref<Lista>('pendiente');
  const retenciones = ref<RetencionPorResolver[] | null>(null);
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await apiRetenciones.porResolver(lista.value);
      if (peticion === ultima) retenciones.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      retenciones.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las retenciones por resolver.');
    }
    if (peticion === ultima) cargando.value = false;
  }

  watch(lista, () => void cargar());
  onMounted(cargar);
  return { lista, retenciones, cargando, cargar };
}

/** La ventana de resolución: la retención, cómo se resolvió y la nota. */
function usarResolucion(alGuardar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const objetivo = ref<RetencionPorResolver | null>(null);
  const resolucion = ref('');
  const nota = ref('');

  function abrir(retencion: RetencionPorResolver): void {
    objetivo.value = retencion;
    resolucion.value = resolucionInicial(retencion);
    nota.value = '';
    errores.value = {};
    abierta.value = true;
  }

  async function guardar(): Promise<void> {
    const actual = objetivo.value;
    errores.value = revisarResolucion(resolucion.value, nota.value);
    if (!actual || Object.keys(errores.value).length > 0) return;
    const cuerpo = cuerpoDeResolucion(resolucion.value, nota.value);
    const bien = await enviar(() => apiRetenciones.resolver(actual.id, cuerpo.resolucion, cuerpo.nota));
    if (!bien) return;
    abierta.value = false;
    await alGuardar();
  }

  return { abierta, objetivo, resolucion, nota, enviando, errores, abrir, guardar };
}

/** Las retenciones por resolver (o ya resueltas), la que se está resolviendo y su formulario. */
export function usarPorResolver(alCambiar: () => Promise<void>) {
  const { lista, retenciones, cargando, cargar } = usarLista();
  const resolucion = usarResolucion(async () => {
    usarAvisos().exito('Resolución guardada.');
    await Promise.all([cargar(), alCambiar()]);
  });
  return { lista, retenciones, cargando, ...resolucion };
}

/** Cuántas retenciones hay por resolver, para la etiqueta de la pestaña; `null` mientras no se sabe. */
export function usarPendientesPorResolver() {
  const cantidad = ref<number | null>(null);

  async function cargar(): Promise<void> {
    try {
      cantidad.value = (await apiRetenciones.porResolver('pendiente')).length;
    } catch {
      cantidad.value = null;
    }
  }

  onMounted(cargar);
  return { cantidad, recargar: cargar };
}
