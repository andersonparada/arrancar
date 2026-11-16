import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar, type FilaDeDocumentoAlCorte } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { paginasEnTotal } from '../filtros-de-documentos';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import { errorDeCorte } from './filtros-de-saldos';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';
import {
  aplicarVista,
  cantidadDeFiltrosDeDocumentos,
  consultaDeDocumentos,
  consultaParaExportar,
  estadoDeImpresion,
  filtrosDeDocumentosVacios,
  FILAS_POR_PAGINA,
  TOPE_DE_IMPRESION,
  type FiltrosDeDocumentos,
  type VistaDeDocumentos,
} from './vistas-de-documentos';

/** Imprimir trae todo lo filtrado (hasta el tope) y lo deja en `impresas` hasta que termina la impresión. */
function usarImpresion(total: () => number, traer: () => Promise<FilaDeDocumentoAlCorte[]>) {
  const avisos = usarAvisos();
  const impresas = ref<FilaDeDocumentoAlCorte[] | null>(null);
  const alTerminar = (): void => {
    impresas.value = null;
  };
  onMounted(() => window.addEventListener('afterprint', alTerminar));
  onBeforeUnmount(() => window.removeEventListener('afterprint', alTerminar));

  async function imprimir(): Promise<void> {
    const estado = estadoDeImpresion(total());
    if (!estado.puede) return avisos.error(estado.mensaje);
    try {
      impresas.value = await traer();
    } catch (error) {
      return avisos.error(error instanceof Error ? error.message : 'No se pudo preparar la impresión.');
    }
    // Espera a que el navegador pinte las filas antes de abrir el diálogo de impresión.
    requestAnimationFrame(() => window.print());
  }
  return { impresas, imprimir };
}

/** Los filtros (con lo que pide el enlace de otro reporte), la página y el reporte que se ve en pantalla. */
function usarListadoDeDocumentos(hoy: string) {
  const pedido = pedidoDesdeLaRuta(useRoute().query);
  const filtros = reactive(filtrosDeDocumentosVacios(hoy, pedido.corte));
  filtros.proveedorId = pedido.proveedorId;
  if (pedido.vista) Object.assign(filtros, aplicarVista(filtros, pedido.vista, hoy));
  const pagina = ref(1);
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.documentos(consultaDeDocumentos(filtros, pagina.value, FILAS_POR_PAGINA)),
    'No se pudo cargar el reporte de documentos.',
  );
  const errorDelCorte = computed(() => errorDeCorte(filtros.corte, reporte.value?.fechaDeInicio ?? null));
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, () => (pagina.value === 1 ? cargarSiElCorteSirve() : (pagina.value = 1)));
  watch(pagina, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  return { filtros, pagina, reporte, cargando, errorDelCorte };
}

/** Lo que el usuario hace con los filtros de R2: cambiar de vista, quitarlos y saber cuántos se salen de lo normal. */
function usarAccionesSobreFiltros(filtros: FiltrosDeDocumentos, hoy: string) {
  return {
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeDocumentos(filtros, hoy)),
    cambiarVista: (vista: VistaDeDocumentos) => Object.assign(filtros, aplicarVista(filtros, vista, hoy)),
    quitarFiltros: () => Object.assign(filtros, aplicarVista(filtrosDeDocumentosVacios(hoy), filtros.vista, hoy)),
  };
}

/** R2, documentos a una fecha: filtros con vistas, páginas, Excel e impresión con tope de 2,000 filas. */
export function usarReporteDeDocumentos() {
  const hoy = fechaDeHoy();
  const listado = usarListadoDeDocumentos(hoy);
  const { filtros, reporte, errorDelCorte } = listado;
  const total = computed(() => reporte.value?.total ?? 0);
  const impresion = usarImpresion(
    () => total.value,
    async () =>
      (await apiReportesDeCuentasPorPagar.documentos(consultaDeDocumentos(filtros, 1, TOPE_DE_IMPRESION))).filas,
  );
  return {
    ...listado,
    ...impresion,
    ...usarAccionesSobreFiltros(filtros, hoy),
    total,
    paginas: computed(() => paginasEnTotal(total.value, FILAS_POR_PAGINA)),
    avisoDeImpresion: computed(() => (total.value > 0 ? estadoDeImpresion(total.value).mensaje : '')),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeDocumentos,
      () => consultaParaExportar(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
