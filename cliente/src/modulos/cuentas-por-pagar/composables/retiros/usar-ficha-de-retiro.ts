import { watch } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiRetiros, type Retiro } from '../../servicios/retiros.api';
import { resumenDeAnularRetiro, resumenDeReabrir } from './ficha-de-retiro';
import { usarCambioDeRetiro, type CambioDeRetiro } from './usar-cambio-de-retiro';
import { usarLiquidacionDeRetiro } from './usar-liquidacion-de-retiro';

/** Reabrir: el servidor pide la fecha del inverso solo si hubo un depósito que anular en Bancos. */
const REABRIR: CambioDeRetiro = {
  resumen: resumenDeReabrir,
  conFecha: (retiro) => Boolean(retiro.liquidacion?.deposito),
  enviar: (id, solicitud) => apiRetiros.reabrir(id, solicitud),
  exito: ({ numero }) => `Retiro ${numero} reabierto: vuelve a estar por liquidar.`,
};

/** Anular: Bancos anula el cheque o la nota, o crea un inverso con la fecha que se escriba. */
const ANULAR: CambioDeRetiro = {
  resumen: resumenDeAnularRetiro,
  conFecha: () => true,
  enviar: (id, solicitud) => apiRetiros.anular(id, solicitud),
  exito: ({ numero }) => `Retiro ${numero} anulado.`,
};

/** La ficha de un retiro y sus acciones (liquidar, reabrir, anular); cada acción recarga la ficha. */
export function usarFichaDeRetiro(id: () => string) {
  const {
    datos: ficha,
    cargando,
    cargar,
  } = usarCarga<Retiro | null>(() => apiRetiros.obtener(id()), null, 'No se pudo cargar el retiro.');
  watch(id, cargar);
  return {
    ficha,
    cargando,
    liquidar: usarLiquidacionDeRetiro(ficha, cargar),
    reabrir: usarCambioDeRetiro(ficha, REABRIR, cargar),
    anular: usarCambioDeRetiro(ficha, ANULAR, cargar),
  };
}
