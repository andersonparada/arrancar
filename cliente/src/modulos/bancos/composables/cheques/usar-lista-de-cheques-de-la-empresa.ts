import { reactive, watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCheques, type ChequeListado } from '../../servicios/cheques.api';
import { usarReferenciasDeMovimiento } from '../movimientos/referencias-de-movimiento';
import { filtroDeLaConsulta, filtrosPorOmision, type FiltrosDeCheques } from './filtros-de-cheques';
import { usarFormularioDeCheque } from './usar-formulario-de-cheque';

/**
 * Los cheques emitidos y anulados de la empresa: filtrarlos, y emitir uno
 * nuevo (los disponibles se ven en su chequera, no aquí).
 */
export function usarListaDeChequesDeLaEmpresa() {
  const filtros = reactive<FiltrosDeCheques>(filtrosPorOmision());
  const {
    datos: cheques,
    cargando,
    cargar,
  } = usarCarga(
    () => apiCheques.listar(filtroDeLaConsulta(filtros)),
    [] as ChequeListado[],
    'No se pudieron cargar los cheques.',
  );
  watch(filtros, cargar);

  const { campos: referencias, filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeMovimiento();
  const emision = usarFormularioDeCheque(cargar);

  return { cheques, cargando, cargar, filtros, opcionesDeCuenta, referencias, emision };
}
