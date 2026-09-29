import { onBeforeUnmount, reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiChequesCaducos, type ReporteDeChequesCaducos } from '../../servicios/cheques-caducos.api';
import { usarReferenciasDeCuenta } from '../cuentas-bancarias/referencias-de-cuenta';
import {
  filtroDeLaConsulta,
  filtrosPorOmision,
  MESES_POR_OMISION,
  type FiltrosDeChequesCaducos,
} from './filtros-de-cheques-caducos';

const ESPERA_AL_ESCRIBIR_EN_MS = 350;
const REPORTE_VACIO: ReporteDeChequesCaducos = {
  mesesDeAntiguedad: MESES_POR_OMISION,
  fechaDeCorte: '',
  totalDeCheques: 0,
  montoTotal: '0.00',
  cheques: [],
};

/** Recarga el reporte poco después de que el usuario deja de escribir, para no llamar al servidor por letra. */
function recargarAlCambiar(filtros: FiltrosDeChequesCaducos, cargar: () => Promise<void>): void {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  watch(filtros, () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(cargar, ESPERA_AL_ESCRIBIR_EN_MS);
  });
  onBeforeUnmount(() => clearTimeout(temporizador));
}

/** El reporte de cheques caducos con sus filtros, y las cuentas para elegir. */
export function usarReporteDeChequesCaducos() {
  const filtros = reactive<FiltrosDeChequesCaducos>(filtrosPorOmision());
  const {
    datos: reporte,
    cargando,
    cargar,
  } = usarCarga(
    () => apiChequesCaducos.reporte(filtroDeLaConsulta(filtros)),
    REPORTE_VACIO,
    'No se pudo cargar el reporte de cheques caducos.',
  );
  recargarAlCambiar(filtros, cargar);

  const { filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
  const mesesDeLaEmpresa = usarSesion().config('bancos.cheques.meses_de_vencimiento', MESES_POR_OMISION);

  return { filtros, reporte, cargando, cargar, opcionesDeCuenta, mesesDeLaEmpresa };
}
