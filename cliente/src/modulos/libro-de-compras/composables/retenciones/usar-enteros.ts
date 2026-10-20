import { computed, ref, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiRetenciones,
  type GrupoDeEntero,
  type MatrizDeEnteros,
  type PagoDeEntero,
} from '../../servicios/retenciones.api';
import { celdaDeLaMatriz, opcionesDeAnio } from './datos-de-pagos';
import { usarAccionConMotivo } from './usar-accion-con-motivo';
import { usarPagoDeEntero } from './usar-pago-de-entero';

/** La matriz del año escogido; al cambiar de año se vuelve a pedir. */
function usarMatriz() {
  const anio = ref(new Date().getFullYear());
  const {
    datos: matriz,
    cargando,
    cargar,
  } = usarCarga<MatrizDeEnteros | null>(
    () => apiRetenciones.enteros(anio.value),
    null,
    'No se pudieron cargar los pagos del año.',
  );
  const recargar = () => cargar();
  watch(anio, recargar);
  return { anio, matriz, cargando, recargar };
}

/** El mes y grupo cuyos pagos se están viendo. */
function usarCeldaAbierta(matriz: { value: MatrizDeEnteros | null }) {
  const abierta = ref<{ mes: string; grupo: GrupoDeEntero } | null>(null);
  const celda = computed(() =>
    abierta.value ? celdaDeLaMatriz(matriz.value, abierta.value.mes, abierta.value.grupo) : null,
  );
  return {
    celdaAbierta: celda,
    abrirCelda: (mes: string, grupo: GrupoDeEntero) => (abierta.value = { mes, grupo }),
    cerrarCelda: () => (abierta.value = null),
  };
}

/** La matriz del año (12 meses por 4 grupos), el mes y grupo abierto y los pagos que se registran, corrigen o anulan. */
export function usarEnteros() {
  const { anio, matriz, cargando, recargar } = usarMatriz();

  return {
    anio,
    matriz,
    cargando,
    recargar,
    opcionesDeAnio: computed(() => opcionesDeAnio(new Date(), anio.value)),
    ...usarCeldaAbierta(matriz),
    pago: usarPagoDeEntero(recargar),
    anulacion: usarAccionConMotivo(
      (pago: PagoDeEntero, motivo: string) => apiRetenciones.anularPago(pago.id, motivo),
      recargar,
      'Pago anulado.',
    ),
  };
}
