import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { apiMovimientos } from '../../servicios/movimientos.api';
import { usarFormularioDeMovimiento } from './usar-formulario-de-movimiento';
import { usarListaDeMovimientos } from './usar-lista-de-movimientos';
import { usarReferenciasDeMovimiento } from './referencias-de-movimiento';

/** Los movimientos de la empresa: filtrarlos, listarlos, registrarlos y editarlos en una ventana. */
export function usarMovimientos() {
  const { registros, cargando, cargar, filtros } = usarListaDeMovimientos();
  const { campos: referencias, filtroDeCuenta: opcionesDeCuenta } = usarReferenciasDeMovimiento();
  const formulario = usarFormularioDeMovimiento(cargar);
  const intercambio = usarIntercambio(apiMovimientos.intercambio, cargar);

  return { registros, cargando, cargar, filtros, opcionesDeCuenta, intercambio, referencias, ...formulario };
}
