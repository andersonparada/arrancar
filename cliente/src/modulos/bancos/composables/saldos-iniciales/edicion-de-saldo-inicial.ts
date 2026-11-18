import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDeCabecera, SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';

/** Lo que muestra cada campo de la ventana del saldo según el estado de cuenta (la cabecera de la cuenta). */
export interface EdicionDeSaldoInicial {
  abierta: boolean;
  /** Con el saldo «de antes» la ventana convierte en partidas en vez de corregir. */
  separando: boolean;
  saldoSegunEstadoDeCuenta: string | number;
  saldoSegunLibrosAnteriores: string | number;
  observaciones: string;
}

/** La ventana abierta, vacía: todavía no hay saldo inicial. */
export const edicionNuevaDeSaldoInicial = (): EdicionDeSaldoInicial => ({
  abierta: true,
  separando: false,
  saldoSegunEstadoDeCuenta: '',
  saldoSegunLibrosAnteriores: '',
  observaciones: '',
});

/**
 * La ventana abierta con lo guardado. Con el saldo «de antes» (global) no hay saldo del estado de cuenta que mostrar:
 * se pide uno nuevo para separarlo en partidas.
 */
export function edicionDeSaldoInicial(saldo: SaldoInicialDeCuenta): EdicionDeSaldoInicial {
  const global = saldo.forma === 'global';
  return {
    abierta: true,
    separando: global,
    saldoSegunEstadoDeCuenta: global ? '' : textoDeEdicion(saldo.saldoSegunEstadoDeCuenta),
    saldoSegunLibrosAnteriores: textoDeEdicion(saldo.saldoSegunLibrosAnteriores),
    observaciones: textoDeEdicion(saldo.observaciones),
  };
}

/** Lo que se manda: el saldo puede ser negativo; lo opcional vacío va como `null`. */
export const datosDeCabecera = (edicion: EdicionDeSaldoInicial): DatosDeCabecera => ({
  saldoSegunEstadoDeCuenta: textoDeEdicion(edicion.saldoSegunEstadoDeCuenta),
  saldoSegunLibrosAnteriores: textoONulo(edicion.saldoSegunLibrosAnteriores),
  observaciones: textoONulo(edicion.observaciones),
});
