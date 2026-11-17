import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import {
  cantidadDeFiltrosDeSaldosAFavor,
  consultaDeSaldosAFavor,
  filtrosDeSaldosAFavorIniciales,
  separarPorPrescripcion,
} from './saldos-a-favor';
import { errorDeCorte } from './filtros-de-saldos';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con lo que pide el enlace de otro reporte), cuántos se salen de lo normal y cómo quitarlos. */
function usarFiltrosDeSaldosAFavor(hoy: string) {
  const pedido = pedidoDesdeLaRuta(useRoute().query);
  const filtros = reactive(filtrosDeSaldosAFavorIniciales(hoy, pedido.proveedorId, pedido.corte));
  return {
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeSaldosAFavor(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeSaldosAFavorIniciales(hoy)),
  };
}

/** R4, saldos a favor y su antigüedad: filtros, reporte (separado entre vigentes y posiblemente prescritos) y Excel. */
export function usarSaldosAFavor() {
  const { filtros, ...deLosFiltros } = usarFiltrosDeSaldosAFavor(fechaDeHoy());
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.saldosAFavor(consultaDeSaldosAFavor(filtros)),
    'No se pudo cargar el reporte de saldos a favor.',
  );
  const errorDelCorte = computed(() => errorDeCorte(filtros.corte, reporte.value?.fechaDeInicio ?? null));
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  const exportar = usarExportacionDeReporte(
    apiReportesDeCuentasPorPagar.intercambioDeSaldosAFavor,
    () => consultaDeSaldosAFavor(filtros),
    () => !!errorDelCorte.value,
  );
  const grupos = computed(() => separarPorPrescripcion(reporte.value?.filas ?? []));
  return { ...deLosFiltros, filtros, reporte, cargando, errorDelCorte, grupos, exportar };
}
