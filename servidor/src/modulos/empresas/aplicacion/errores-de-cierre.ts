import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';

/** El id no es un cierre de la carga inicial de esa empresa (puede ser el de una reapertura o de otra empresa). */
export class CierreDeCargaNoEncontrado extends RecursoNoEncontrado {
  constructor() {
    super('El cierre de la carga inicial');
  }
}

/** La empresa no tiene balance de apertura adjunto (al abrirlo o quitarlo). */
export class SinBalanceDeApertura extends RecursoNoEncontrado {
  constructor() {
    super('El balance de apertura');
  }
}
