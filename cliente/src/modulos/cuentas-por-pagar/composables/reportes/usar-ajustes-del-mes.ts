import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeAjustes,
  consultaDeAjustes,
  filtrosDeAjustesIniciales,
  opcionesDeMeses,
} from './ajustes-del-mes';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** R8, ajustes del mes: filtros, reporte y Excel. */
export function usarAjustesDelMes() {
  const hoy = fechaDeHoy();
  const filtros = reactive(filtrosDeAjustesIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).proveedorId));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.ajustesDelMes(consultaDeAjustes(filtros)),
    'No se pudo cargar el reporte de ajustes del mes.',
  );
  alDejarDeEscribir(filtros, () => void cargar());
  onMounted(() => void cargar());
  return {
    filtros,
    reporte,
    cargando,
    meses: opcionesDeMeses(hoy),
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeAjustes(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeAjustesIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeAjustes,
      () => consultaDeAjustes(filtros),
      () => false,
    ),
  };
}
