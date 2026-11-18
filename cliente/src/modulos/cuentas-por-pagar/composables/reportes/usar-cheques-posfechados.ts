import { computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import { usarProveedoresDelFiltro } from '../usar-lista-de-documentos';
import {
  cantidadDeFiltrosDeCheques,
  consultaDeCheques,
  errorDeCorteDeCheques,
  filtrosDeChequesIniciales,
} from './cheques-posfechados';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con lo que pide el enlace de otro reporte) y el reporte, que se pide al cambiarlos. */
function usarReporteDeCheques(hoy: string) {
  const pedido = pedidoDesdeLaRuta(useRoute().query);
  const filtros = reactive(filtrosDeChequesIniciales(hoy, pedido.proveedorId, pedido.corte));
  const errorDelCorte = computed(() => errorDeCorteDeCheques(filtros.corte));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.chequesPosfechados(consultaDeCheques(filtros)),
    'No se pudo cargar el reporte de cheques posfechados.',
  );
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  return { filtros, reporte, cargando, errorDelCorte };
}

/** R7, cheques posfechados al corte: filtros, reporte y Excel. */
export function usarChequesPosfechados() {
  const hoy = fechaDeHoy();
  const { filtros, errorDelCorte, ...datos } = usarReporteDeCheques(hoy);
  return {
    ...datos,
    filtros,
    errorDelCorte,
    proveedores: usarProveedoresDelFiltro(),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeCheques(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeChequesIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeCheques,
      () => consultaDeCheques(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
