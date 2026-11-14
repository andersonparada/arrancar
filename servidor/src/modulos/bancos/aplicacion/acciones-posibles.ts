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
  /** Lo generó otro módulo (P6): su concepto lo fija ese módulo. */
  esDeOtroModulo: boolean;
  /** Su concepto es el de sistema «Pago a proveedores»; con las demás condiciones de `estaMarcada`, es una nota marcada. */
  conceptoEsDePago: boolean;
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
  /** Estructural: el servidor además exige que Cuentas por pagar esté activo al marcar. */
  puedeMarcar: boolean;
  puedeDesmarcar: boolean;
}

const esNotaSuelta = (hechos: HechosDeUnMovimiento): boolean =>
  hechos.tipo === 'debito' &&
  !hechos.saldoInicial &&
  !hechos.esDeTransferencia &&
  !hechos.esInverso &&
  !hechos.esDeOtroModulo;

const esVigente = (hechos: HechosDeUnMovimiento): boolean => !hechos.anulado && !hechos.revertido;

/**
 * Una nota de débito suelta, sin origen, con el concepto «Pago a proveedores»: la marca para Cuentas por pagar es el
 * concepto mismo (no hay columna). Una nota anulada o revertida conserva su concepto y sigue siendo «marcada».
 */
export const estaMarcada = (hechos: HechosDeUnMovimiento): boolean => esNotaSuelta(hechos) && hechos.conceptoEsDePago;

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
    const sinAcciones = { puedeAnular: false, puedeReclasificar: false, puedeMarcar: false, puedeDesmarcar: false };
    return { ...sinAcciones, puedeEliminar: !hechos.cuentaConConciliaciones };
  }
  return { ...accionesDeBaja(hechos), puedeReclasificar: sePuedeReclasificar(hechos), ...accionesDeMarca(hechos) };
}

/** Anular y eliminar: solo notas sueltas; lo que generó otro módulo se anula, pero no se elimina. */
function accionesDeBaja(hechos: HechosDeUnMovimiento) {
  const suelto = !hechos.esDeTransferencia && hechos.tipo !== 'cheque';
  const vigente = !hechos.anulado && !hechos.revertido && !hechos.esInverso;
  return {
    puedeAnular: suelto && vigente,
    puedeEliminar: suelto && estaLimpio(hechos) && !hechos.esDeOtroModulo,
  };
}

/** Marcar una nota vigente que no lo está, o desmarcar la que sí (CP4). */
function accionesDeMarca(hechos: HechosDeUnMovimiento) {
  const vigente = esVigente(hechos);
  return {
    puedeMarcar: esNotaSuelta(hechos) && vigente && !hechos.conceptoEsDePago,
    puedeDesmarcar: estaMarcada(hechos) && vigente,
  };
}

/** Solo un original de Bancos: ni las notas de una transferencia, ni un inverso, ni lo que generó otro módulo. */
const sePuedeReclasificar = (hechos: HechosDeUnMovimiento): boolean =>
  !hechos.esDeTransferencia && !hechos.esInverso && !hechos.esDeOtroModulo;

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
    puedeBlanquear: estado === 'emitido' && movimiento !== null && estaLimpio(movimiento) && !movimiento.esDeOtroModulo,
  };
}
