import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import {
  apiCuentasPorPagar,
  type DocumentoPorPagar,
  type ProveedorParaFiltro,
} from '../servicios/cuentas-por-pagar.api';
import {
  consultaDeDocumentos,
  DOCUMENTOS_POR_PAGINA,
  filtrosIniciales,
  paginasEnTotal,
  type FiltrosDeDocumentos,
} from './filtros-de-documentos';

/**
 * Los proveedores para el filtro. Si el usuario no puede verlos, el filtro de proveedor se queda solo con «Todos»:
 * no es motivo para impedir que vea sus documentos.
 */
function usarProveedoresDelFiltro() {
  const proveedores = ref<ProveedorParaFiltro[]>([]);
  onMounted(async () => {
    proveedores.value = await apiCuentasPorPagar.listarProveedores().catch(() => []);
  });
  return proveedores;
}

/** Pide la página de documentos; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeDocumentos(filtros: FiltrosDeDocumentos, pagina: Ref<number>) {
  const avisos = usarAvisos();
  const documentos = ref<DocumentoPorPagar[]>([]);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiCuentasPorPagar.listar(consultaDeDocumentos(filtros, pagina.value));
      if (peticion !== ultimaPeticion) return;
      documentos.value = respuesta.elementos;
      total.value = respuesta.total;
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista.');
    }
    cargando.value = false;
  }

  return { documentos, total, cargando, cargar };
}

/** La lista de documentos por pagar: filtros, página y recarga cuando cambian. */
export function usarListaDeDocumentos() {
  const filtros = reactive(filtrosIniciales());
  const pagina = ref(1);
  const { documentos, total, cargando, cargar } = usarPeticionDeDocumentos(filtros, pagina);

  // Cambiar un filtro vuelve a la primera página; si ya estaba en ella, recarga directo.
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargar() : (pagina.value = 1)));
  watch(pagina, cargar);
  onMounted(cargar);

  return {
    documentos,
    total,
    pagina,
    cargando,
    filtros,
    recargar: cargar,
    paginas: computed(() => paginasEnTotal(total.value, DOCUMENTOS_POR_PAGINA)),
    proveedores: usarProveedoresDelFiltro(),
    quitarFiltros: () => Object.assign(filtros, filtrosIniciales()),
    limite: DOCUMENTOS_POR_PAGINA,
  };
}
