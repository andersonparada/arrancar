import { computed } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import { agruparPartidas } from './grupos-de-partidas';
import { usarAnulacionDePartida } from './usar-anulacion-de-partida';
import { usarBajasDeApertura } from './usar-bajas-de-apertura';
import { usarFormularioDeCabecera } from './usar-formulario-de-cabecera';
import { usarFormularioDePartida } from './usar-formulario-de-partida';

/** La ficha de una cuenta: el cuadre, sus cinco grupos de partidas y todo lo que se puede hacer con ellos. */
export function usarFichaDeSaldoInicial(cuentaBancariaId: string) {
  const {
    datos: saldo,
    cargando,
    cargar,
  } = usarCarga(
    () => apiSaldosIniciales.obtener(cuentaBancariaId),
    null as SaldoInicialDeCuenta | null,
    'No se pudo cargar el saldo inicial de la cuenta.',
  );
  return {
    saldo,
    cargando,
    grupos: computed(() => agruparPartidas(saldo.value?.partidas ?? [])),
    cabecera: usarFormularioDeCabecera(cuentaBancariaId, cargar),
    partida: usarFormularioDePartida(cuentaBancariaId, saldo, cargar),
    anulacion: usarAnulacionDePartida(cuentaBancariaId, cargar),
    ...usarBajasDeApertura(cuentaBancariaId, cargar),
  };
}
