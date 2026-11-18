import { computed, onMounted, reactive, ref, watch, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiReportesDeCuentasPorPagar } from '../../servicios/reportes.api';
import { fechaDeHoy } from '../dinero';
import {
  cantidadDeFiltrosDeNotas,
  consultaDeNotas,
  errorDeCorteDeNotas,
  filtrosDeNotasIniciales,
  opcionesDeCuentas,
  unirCuentas,
  type CuentaConocida,
  type FiltrosDeNotas,
} from './notas-sin-aplicar';
import type { ReporteDeNotasSinAplicar } from '../../servicios/tipos-de-reportes-de-efectivo';
import { pedidoDesdeLaRuta } from './parametros-de-la-ruta';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Los filtros (con el corte que pida el enlace de R1) y el reporte, que se pide al cambiarlos. */
function usarReporteDeNotas(hoy: string) {
  const filtros = reactive(filtrosDeNotasIniciales(hoy, pedidoDesdeLaRuta(useRoute().query).corte));
  const errorDelCorte = computed(() => errorDeCorteDeNotas(filtros.corte));
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => apiReportesDeCuentasPorPagar.notasSinAplicar(consultaDeNotas(filtros)),
    'No se pudo cargar el reporte de notas sin aplicar.',
  );
  const cargarSiElCorteSirve = (): void => {
    if (!errorDelCorte.value) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiElCorteSirve);
  onMounted(cargarSiElCorteSirve);
  return { filtros, reporte, cargando, errorDelCorte };
}

/** Las cuentas del selector salen de lo que ya trajo el reporte (así la filtrada no desaparece). */
function usarCuentasConocidas(reporte: ShallowRef<ReporteDeNotasSinAplicar | null>, filtros: FiltrosDeNotas) {
  const cuentas = ref<CuentaConocida[]>([]);
  watch(reporte, (nuevo) => {
    if (nuevo) cuentas.value = unirCuentas(cuentas.value, nuevo.filas);
  });
  return {
    opcionesDeCuenta: computed(() => opcionesDeCuentas(cuentas.value)),
    nombreDeLaCuenta: computed(() => cuentas.value.find((c) => c.id === filtros.cuentaBancariaId)?.nombre ?? null),
  };
}

/** R11, notas de débito sin aplicar: filtros, reporte y Excel. */
export function usarNotasSinAplicar() {
  const hoy = fechaDeHoy();
  const { filtros, errorDelCorte, ...datos } = usarReporteDeNotas(hoy);
  return {
    ...datos,
    filtros,
    errorDelCorte,
    ...usarCuentasConocidas(datos.reporte, filtros),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDeNotas(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, filtrosDeNotasIniciales(hoy)),
    exportar: usarExportacionDeReporte(
      apiReportesDeCuentasPorPagar.intercambioDeNotas,
      () => consultaDeNotas(filtros),
      () => !!errorDelCorte.value,
    ),
  };
}
