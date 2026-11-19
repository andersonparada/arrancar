import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';

/**
 * El resumen del saldo inicial de una cuenta para su ficha (solo lectura): sin el permiso de verlo no se pide, para
 * que abrir la ficha no dé un error. Se registra y se corrige en la pantalla «Saldos iniciales».
 */
export function usarResumenDeSaldoInicial(cuentaBancariaId: string) {
  const sesion = usarSesion();
  return usarCarga(
    async () => (sesion.puede('bancos.saldos-iniciales.ver') ? apiSaldosIniciales.obtener(cuentaBancariaId) : null),
    null as SaldoInicialDeCuenta | null,
    'No se pudo cargar el saldo inicial.',
  );
}
