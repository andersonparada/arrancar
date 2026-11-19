import { reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCheques, type ChequeListado } from '../../servicios/cheques.api';
import { usarReferenciasDeCuenta } from '../cuentas-bancarias/referencias-de-cuenta';
import { filtroDeLaConsulta, filtrosDesdeLaRuta, type FiltrosDeCheques } from './filtros-de-cheques';
import { usarImpresionDeUnCheque } from '../impresion-de-cheques/usar-impresion-de-un-cheque';
import { usarFormularioDeCheque } from './usar-formulario-de-cheque';
import { usarSeleccionParaLote } from './usar-seleccion-para-lote';

/**
 * Los cheques emitidos y anulados de la empresa: filtrarlos, emitir uno nuevo (los disponibles se ven en su
 * chequera, no aquí), elegir varios para imprimirlos de una vez y todo lo del papel de cada uno.
 */
export function usarListaDeChequesDeLaEmpresa() {
  const filtros = reactive<FiltrosDeCheques>(filtrosDesdeLaRuta(useRoute().query));
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

  const { campos: referencias, filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeCuenta();
  const emision = usarFormularioDeCheque(cargar);
  const lote = reactive(usarSeleccionParaLote(cheques));
  const impresion = usarImpresionDeUnCheque(cargar);

  return { cheques, cargando, cargar, filtros, opcionesDeCuenta, referencias, emision, lote, impresion };
}
