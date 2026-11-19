import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiMovimientos, type ReporteDeMovimientos } from '../../servicios/movimientos.api';
import { errorDeRango } from '../comunes/rango-de-fechas';
import { filtroDeLaConsulta, filtrosPorOmision } from '../movimientos/filtros-de-movimientos';

const REPORTE_VACIO: ReporteDeMovimientos = {
  saldoAnterior: null,
  filas: [],
  saldoFinal: null,
  sinClasificar: { cantidad: 0, montoDeEntradas: '0.00', montoDeSalidas: '0.00' },
};

/** La cuenta con la que arranca si llegó por la ruta (`?cuenta=<id>`). */
function cuentaDeLaRuta(): string | null {
  const { cuenta } = useRoute().query;
  return typeof cuenta === 'string' ? cuenta : null;
}

/** El estado de cuenta: la cuenta es obligatoria, así que no pide nada hasta que se elige una y el rango sirve. */
export function usarEstadoDeCuenta() {
  const avisos = usarAvisos();
  const filtros = reactive(filtrosPorOmision(cuentaDeLaRuta()));
  const reporte = ref(REPORTE_VACIO);
  const cargando = ref(false);
  const errorDelRango = computed(() => errorDeRango(filtros));
  const listo = computed(() => !!filtros.cuentaBancariaId && !errorDelRango.value);

  async function cargar(): Promise<void> {
    if (!listo.value) {
      reporte.value = REPORTE_VACIO;
      return;
    }
    cargando.value = true;
    try {
      reporte.value = await apiMovimientos.reporte(filtroDeLaConsulta(filtros));
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el estado de cuenta.');
    } finally {
      cargando.value = false;
    }
  }
  watch(filtros, cargar, { immediate: true });

  return { filtros, reporte, cargando, errorDelRango, listo };
}
