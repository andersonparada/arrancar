import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';

/** La conciliación no tiene archivo del estado de cuenta (al abrirlo o quitarlo). */
export class ConciliacionSinEstadoDeCuenta extends RecursoNoEncontrado {
  constructor() {
    super('El estado de cuenta de la conciliación');
  }
}

/** La cuenta no tiene evidencia de la apertura (al abrirla o quitarla). */
export class SaldoInicialSinEvidencia extends RecursoNoEncontrado {
  constructor() {
    super('La evidencia del saldo inicial');
  }
}
