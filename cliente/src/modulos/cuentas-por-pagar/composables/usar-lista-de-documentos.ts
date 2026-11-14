import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import {
  apiCuentasPorPagar,
  type ConsultaDeDocumentos,
  type DocumentoPorPagar,
  type ProveedorParaFiltro,
} from '../servicios/cuentas-por-pagar.api';
import { consultaDeDocumentos, DOCUMENTOS_POR_PAGINA, filtrosIniciales, paginasEnTotal } from './filtros-de-documentos';

/** Los proveedores para el filtro; si falla, el filtro queda solo con «Todos» y se avisa por qué. */
export function usarProveedoresDelFiltro() {
  const avisos = usarAvisos();
  const proveedores = ref<ProveedorParaFiltro[]>([]);
  onMounted(async () => {
    try {
      proveedores.value = await apiCuentasPorPagar.listarProveedores();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de proveedores.');
    }
  });
  return proveedores;
}

/** Pide la página de documentos; si llegan dos respuestas, solo vale la de la última petición. */
export function usarPeticionDeDocumentos(construirConsulta: () => ConsultaDeDocumentos) {
  const avisos = usarAvisos();
  const documentos = ref<DocumentoPorPagar[]>([]);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const respuesta = await apiCuentasPorPagar.listar(construirConsulta());
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
  const { documentos, total, cargando, cargar } = usarPeticionDeDocumentos(() =>
    consultaDeDocumentos(filtros, pagina.value),
  );

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
