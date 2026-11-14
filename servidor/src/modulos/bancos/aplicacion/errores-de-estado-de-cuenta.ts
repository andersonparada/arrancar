import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';

/** La conciliación no tiene archivo del estado de cuenta (al abrirlo o quitarlo). */
export class ConciliacionSinEstadoDeCuenta extends RecursoNoEncontrado {
  constructor() {
    super('El estado de cuenta de la conciliación');
  }
}
