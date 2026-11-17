import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeContrasenas,
  consultaDeContrasenas,
  errorDeFechaPrometida,
  filtrosDeContrasenasIniciales,
} from './contrasenas-por-pagar';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con lo que pide el enlace de otro reporte), cuántos se salen de lo normal y cómo quitarlos. */
function usarFiltrosDeContrasenas(hoy: string) {
  const filtros = reactive(filtrosDeContrasenasIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).proveedorId));
  return {
    filtros,
    proveedores: usarProveedoresDelFiltro(),
    errorDeLaFecha: computed(() => errorDeFechaPrometida(filtros.pagoPrometidoHasta)),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeContrasenas(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeContrasenasIniciales(hoy)),
  };
}

/** R5, contraseñas con pago prometido vencido: filtros, reporte y Excel. */
export function usarContrasenasPorPagar() {
  const { filtros, ...deLosFiltros } = usarFiltrosDeContrasenas(fechaDeHoy());
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.contrasenasPorPagar(consultaDeContrasenas(filtros)),
    'No se pudo cargar el reporte de contraseñas.',
  );
  const cargarSiLaFechaSirve = (): void => {
    if (!deLosFiltros.errorDeLaFecha.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiLaFechaSirve);
  onMounted(cargarSiLaFechaSirve);
  const exportar = usarExportacionDeReporte(
    apiReportesDeCuentasPorPagar.intercambioDeContrasenas,
    () => consultaDeContrasenas(filtros),
    () => !!deLosFiltros.errorDeLaFecha.value,
  );
  return { ...deLosFiltros, filtros, reporte, cargando, exportar };
}
