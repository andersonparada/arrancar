import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { PartidaDeApertura, SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/**
 * Las dos eliminaciones de la ficha, cada una con su ventana de motivo: el saldo inicial entero (con sus partidas) y una
 * partida. No se anula ni se deja el rastro de otra forma: se borra de verdad y queda en la auditoría.
 */
export function usarBajasDeApertura(cuentaBancariaId: string, alTerminar: () => Promise<void>) {
  const eliminacionDelSaldo = usarBajaDeRegistro<SaldoInicialDeCuenta>({
    ejecutar: (_saldo, { motivo }) => apiSaldosIniciales.eliminar(cuentaBancariaId, motivo),
    aviso: 'Saldo inicial eliminado.',
    alTerminar,
  });
  const eliminacionDePartida = usarBajaDeRegistro<PartidaDeApertura>({
    ejecutar: (partida, { motivo }) =>
      apiSaldosIniciales.eliminarPartida(cuentaBancariaId, partida.movimientoId, motivo),
    aviso: 'Partida eliminada.',
    alTerminar,
  });
  return { eliminacionDelSaldo, eliminacionDePartida };
}
