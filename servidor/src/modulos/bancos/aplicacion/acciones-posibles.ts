import type { EstadoDelCheque } from '../dominio/cheque.js';

/** Lo que se sabe de un movimiento para decidir qué se puede hacer con él. */
export interface HechosDeUnMovimiento {
  tipo: 'credito' | 'debito' | 'cheque';
  saldoInicial: boolean;
  esDeTransferencia: boolean;
  marcadoEnConciliacion: boolean;
  anulado: boolean;
  revertido: boolean;
  esInverso: boolean;
  /** Su fecha cae en un mes ya conciliado (autorizado) de su cuenta. */
  mesConciliado: boolean;
  /** Su cuenta tiene alguna conciliación, de cualquier estado. */
  cuentaConConciliaciones: boolean;
}

/** Lo que la pantalla puede ofrecer de una nota o de un saldo inicial. */
export interface AccionesDeMovimiento {
  puedeAnular: boolean;
  puedeEliminar: boolean;
  puedeReclasificar: boolean;
}

/**
 * «Limpio» es lo que se puede eliminar de verdad: nunca pasó por el banco (no está marcado en una
 * conciliación ni cae en un mes conciliado) y no tiene historia de reversión (ni revierte a otro ni
 * fue revertido) ni está anulado.
 */
export function estaLimpio(hechos: HechosDeUnMovimiento): boolean {
  const conHistoria = hechos.anulado || hechos.revertido || hechos.esInverso;
  return !conHistoria && !hechos.marcadoEnConciliacion && !hechos.mesConciliado;
}

/**
 * Las reglas del B7 para una nota o un saldo inicial. Las notas de una transferencia y los movimientos
 * de cheque se anulan o eliminan desde su transferencia o su cheque, nunca sueltos. El saldo inicial no
 * se anula: se corrige o, si la cuenta nunca se concilió, se elimina.
 */
export function accionesDeMovimiento(hechos: HechosDeUnMovimiento): AccionesDeMovimiento {
  if (hechos.saldoInicial) {
    return { puedeAnular: false, puedeEliminar: !hechos.cuentaConConciliaciones, puedeReclasificar: false };
  }
  const suelto = !hechos.esDeTransferencia && hechos.tipo !== 'cheque';
  const vigente = !hechos.anulado && !hechos.revertido && !hechos.esInverso;
  const puedeReclasificar = !hechos.esDeTransferencia && !hechos.esInverso;
  return { puedeAnular: suelto && vigente, puedeEliminar: suelto && estaLimpio(hechos), puedeReclasificar };
}

/** Lo que la pantalla puede ofrecer de una transferencia. */
export interface AccionesDeTransferencia {
  puedeAnular: boolean;
  puedeEliminar: boolean;
}

/** Una transferencia se anula si no está anulada, y se elimina si sus dos notas están limpias. */
export function accionesDeTransferencia(
  anulada: boolean,
  notas: { origen: HechosDeUnMovimiento; destino: HechosDeUnMovimiento },
): AccionesDeTransferencia {
  return {
    puedeAnular: !anulada,
    puedeEliminar: !anulada && estaLimpio(notas.origen) && estaLimpio(notas.destino),
  };
}

/** Lo que la pantalla puede ofrecer de un cheque. */
export interface AccionesDeCheque {
  puedeAnular: boolean;
  puedeBlanquear: boolean;
}

/**
 * Un cheque se anula si no está anulado; se blanquea si está emitido y su movimiento está limpio.
 * Los cheques nunca se eliminan: su número ya se consumió.
 */
export function accionesDeCheque(estado: EstadoDelCheque, movimiento: HechosDeUnMovimiento | null): AccionesDeCheque {
  return {
    puedeAnular: estado !== 'anulado',
    puedeBlanquear: estado === 'emitido' && movimiento !== null && estaLimpio(movimiento),
  };
}
