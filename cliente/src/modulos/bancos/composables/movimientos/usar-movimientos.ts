import { computed } from 'vue';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiMovimientos } from '../../servicios/movimientos.api';
import { usarFormularioDeCheque } from '../cheques/usar-formulario-de-cheque';
import { usarReferenciasDeTransferencia } from '../transferencias/referencias-de-transferencia';
import { usarFormularioDeTransferencia } from '../transferencias/usar-formulario-de-transferencia';
import { usarFormularioDeMovimiento } from './usar-formulario-de-movimiento';
import { usarListaDeMovimientos } from './usar-lista-de-movimientos';
import { usarReferenciasDeMovimiento } from './referencias-de-movimiento';

/** Los movimientos de la empresa: filtrarlos, listarlos, registrarlos, editarlos, transferirlos y emitir cheques. */
export function usarMovimientos() {
  const { registros, cargando, cargar, filtros } = usarListaDeMovimientos();
  const { campos: referencias, filtroDeCuenta: opcionesDeCuenta, cuentasBancarias } = usarReferenciasDeMovimiento();
  const formulario = usarFormularioDeMovimiento(cargar);
  const intercambio = usarIntercambio(apiMovimientos.intercambio, cargar);
  const transferencia = usarFormularioDeTransferencia(cargar);
  const origenElegido = computed(() => transferencia.edicion.value.cuentaOrigenId);
  const referenciasDeTransferencia = usarReferenciasDeTransferencia(cuentasBancarias, origenElegido);
  const cheque = usarFormularioDeCheque(cargar);

  return {
    registros,
    cargando,
    cargar,
    filtros,
    opcionesDeCuenta,
    intercambio,
    referencias,
    ...formulario,
    transferencia,
    referenciasDeTransferencia,
    cheque,
  };
}
