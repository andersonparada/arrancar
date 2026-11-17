import { computed, onMounted, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeEstado,
  consultaDeEstadoDeCuenta,
  errorDelRango,
  filtrosDeEstadoIniciales,
  puedePedirElEstado,
} from './estado-de-cuenta';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con el proveedor y el día que pide su ficha), cuántos se salen de lo normal y cómo quitarlos. */
function usarFiltrosDelEstado(hoy: string) {
  const pedido = pedidoDesdeLaRuta(useRoute().query);
  const filtros = reactive(filtrosDeEstadoIniciales(hoy, pedido.proveedorId, pedido.corte));
  return {
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    errorDelRango: computed(() => errorDelRango(filtros)),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeEstado(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeEstadoIniciales(hoy, filtros.proveedorId)),
  };
}

/** R3, estado de cuenta de un proveedor: filtros, reporte (se pide con proveedor y rango válidos) y Excel. */
export function usarEstadoDeCuenta() {
  const { filtros, ...deLosFiltros } = usarFiltrosDelEstado(fechaDeHoy());
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.estadoDeCuenta(consultaDeEstadoDeCuenta(filtros)),
    'No se pudo cargar el estado de cuenta.',
  );
  const cargarSiSirve = (): void => {
    if (puedePedirElEstado(filtros)) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiSirve);
  onMounted(cargarSiSirve);
  watch(
    () => filtros.proveedorId,
    (proveedorId) => (proveedorId ? undefined : (reporte.value = null)),
  );
  const exportar = usarExportacionDeReporte(
    apiReportesDeCuentasPorPagar.intercambioDelEstado,
    () => consultaDeEstadoDeCuenta(filtros),
    () => !puedePedirElEstado(filtros),
  );
  return { ...deLosFiltros, filtros, reporte, cargando, exportar };
}
