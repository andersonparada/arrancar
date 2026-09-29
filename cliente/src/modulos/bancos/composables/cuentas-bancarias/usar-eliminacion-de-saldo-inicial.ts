import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/** Elimina el saldo inicial (solo si la cuenta nunca se concilió): no se anula, se corrige o se elimina. */
export function usarEliminacionDeSaldoInicial(alEliminar: () => Promise<void>) {
  return usarBajaDeRegistro<Movimiento>({
    ejecutar: (saldoInicial, { motivo }) => apiSaldosIniciales.eliminar(saldoInicial.id, motivo),
    aviso: 'Saldo inicial eliminado.',
    alTerminar: alEliminar,
  });
}
