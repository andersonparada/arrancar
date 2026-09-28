import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { usarAnulacionDeSaldoInicial } from './usar-anulacion-de-saldo-inicial';
import { usarFormularioDeSaldoInicial } from './usar-formulario-de-saldo-inicial';

/** El saldo inicial vigente de una cuenta bancaria, en su ficha: verlo, registrarlo, corregirlo y anularlo. */
export function usarSaldoInicial(cuentaBancariaId: string) {
  const {
    datos: saldoInicial,
    cargando,
    cargar,
  } = usarCarga(
    () => apiSaldosIniciales.deLaCuenta(cuentaBancariaId),
    null as Movimiento | null,
    'No se pudo cargar el saldo inicial.',
  );
  const formulario = usarFormularioDeSaldoInicial(cuentaBancariaId, cargar);
  const anulacion = usarAnulacionDeSaldoInicial(cargar);

  return { saldoInicial, cargando, formulario, anulacion };
}
